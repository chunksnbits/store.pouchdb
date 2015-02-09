/* jshint node:true */
'use strict';

// ----------------------------------------------------------------- Initialization
// ------------------------------------------------------------ Dependencies
// -------------------------------------------------------
var PouchDB = require('pouchdb');
var q = require('q');
var _ = require('lodash');
var CollectionError = require('../utils/error-handler.js');

var Collection = require('../shelfdb.js');

// PouchDB internal utils
var Store = require('./shelf-pouchdb/store.js');


PouchAdapter.prototype._extractSchemaDefaults = function (schema) {
  return this.schema._defaults || _.extend({},
    _.transform(schema.hasMany,
      function (result, connection, key) {
        result[key] = [];
      }),
    _.transform(schema.hasOne,
      function (result, connection, key) {
        result[key] = null;
      }));
};


// ------------------------------------------------------------ Object creation
// ------------------------------------------------------- Constructor
function PouchAdapter (collection) {

  var options = _.merge({},
    Store.initializeStore(collection.name, collection.options),
    collection.options);

  this.collection = collection;

  this.pouch = new PouchDB(collection.name, options);
}

PouchAdapter.prototype.store = function (items) {

  var self = this;
  var expectSingleResult = !_.isArray(items);

  //
  items = expectSingleResult ? [items] : items;


  //
  // 1. Store all relations attached to the
  //    items to be persisted.
  //    Will return a processed set of item(s)
  //    coupled to their relations.
  //
  var promises = _.map(items, function (item) {
    return self._storeItemRelations(item);
  });

  var stashed, markedItems;

  return q.all(promises)
    .then(function (data) {
      //
      // 2. Split items and relations into separate
      //    containers.
      //
      return self._separateItemAndRelations(data);
    })
    .then(function (mappedData) {
      //
      // 3. Stash separated item and relations for later use
      //
      stashed = mappedData;
      return stashed.items;
    })
    .then(function (items) {
      return self._markChangedItems(items);
    })
    .then(function (items) {
      markedItems = items;
      return markedItems;
    })
    .then(function (markedItems) {
      return _.compact(_.map(markedItems, function (marked) {
        return marked.changed ? marked.item : undefined;
      }));
    })
    .then(function (itemsToStore) {
      //
      // 4. Store items.
      //    At this point items will reference their
      //    relations only by id. The full dataset
      //    is stashed in the relations array.
      //
      return self.pouch.bulkDocs(self._convertToPouch(itemsToStore));
    })
    .then(function (response)  {
      var error = checkForErrors(response);
      if (error) {
        return q.reject(error);
      }
      return response;
    })
    .then(function (response)  {
      var index = 0;
      return _.map(markedItems, function (marked) {
        return marked.changed ? response[index++] : marked.item;
      });
    })
    .then(function (updated) {
      //
      // 5. Reassemble items, relations and the updated
      //    versioning informatino (id, rev) obtained from
      //    the storage operation
      //

      return self._mergeItemAndRelations(stashed.items, stashed.relations, updated);
    })
    .then(function (items) {
      //
      // 6. Return data in the expected format
      //

      return expectSingleResult ? _.first(items) : items;
    });
};

PouchAdapter.prototype._separateItemAndRelations = function (data) {
  return {
    items: _.map(data, function (token) {
      return token.item;
    }),
    relations: _.map(data, function (token) {
      return token.relations;
    })
  };
};

PouchAdapter.prototype._mergeItemAndRelations = function (items, relations, docs) {
  var self = this;
  return _.map(items, function (item, index) {
    return _.extend(
      {},
      item,
      relations[index],
      self._convertFromPouch(docs[index])
    );
  });
};

PouchAdapter.prototype._markChangedItems = function (items) {
  var self = this;

  return q.all(_.map(items, function (item) {
    if (item.id) {
      return self._findOne(item.id);
    }

    return q.resolve(false);
  }))
    .then(function (storedItems) {
      return _.map(storedItems, function (storedItem, index) {
        var updatedItem = items[index];

        var isChanged = !_.isEqual(storedItem, updatedItem);

        return {
          changed: isChanged,
          item: isChanged ? updatedItem : storedItem
        };
      });
    });
};


// ------------------------------------------------------- Relations
PouchAdapter.prototype._storeItemRelations = function (item) {

  var schema = this.collection.schema;
  var relations = {};

  function extractIds (docs) {
    return _.map(docs, function (doc) {
      return doc.id;
    });
  }

  function storeHasManyRelation (item) {
    return _.map(schema.hasMany, function (connection, name) {

      var value = item[name];
      delete item[name];

      if (!_.isObject(value)) {
        return;
      }

      return connection.store(value)
        .then(function (docs) {
          relations[name] = docs;
          item[name + '_ids'] = extractIds(docs);
        });
    });
  }

  function storeHasOneRelation (item) {
    return _.map(schema.hasOne, function (connection, name) {

      var value = item[name];
      delete item[name];

      if (!_.isObject(value)) {
        return;
      }

      return connection.store(value)
        .then(function (doc) {
          relations[name] = doc;
          item[name + '_id'] = doc.id;
        });
    });
  }

  var promises = [];

  promises.push.apply(promises, storeHasManyRelation(item));
  promises.push.apply(promises, storeHasOneRelation(item));

  return q.all(promises)
    .then(function () {
      return {
        item: item,
        relations: relations
      };
    });
};

// // ------------------------------------------------------------ Lookups
// // ------------------------------------------------------- findAll
PouchAdapter.prototype.findAll = function () {
  return this.find();
};

// // ------------------------------------------------------- find
PouchAdapter.prototype.find = function () {
  var query = arguments.length ? arguments[0] : null;
  var promise;

  var expectSingleResult = false;
  var isArray = _.isArray(query);

  if (_.isEmpty(query)) {
    promise = this._findAll();
  }
  else if (_.isObject(query) && !isArray) {
    promise = this._findByQuery(query);
  }
  else {
    promise = this._findBulk(isArray ? query : [query]);
    expectSingleResult = !isArray;
  }

  var self = this;

  return promise
    .then(function (items) {
      return self._addItemRelations(items);
    })
    .then(function (items) {
      return expectSingleResult ? _.first(items) : items;
    });
};

PouchAdapter.prototype._findOne = function (id) {
  var self = this;

  return this.pouch.get(id, { include_docs: true })
    .then(function (item) {
      return self._convertFromPouch(item);
    });
};

PouchAdapter.prototype._findBulk = function (ids) {
  var self = this;

  var promises = _.map(ids, function (id) {
    return self.pouch.get(id, { include_docs: true })
      .then(function (item) {
        return self._convertFromPouch(item);
      });
  });

  return q.all(promises);
};

PouchAdapter.prototype._findAll = function () {
  var self = this;
  var deferred = q.defer();

  this.pouch.allDocs({ include_docs: true },
    function (error, result) {
      if (error) {
        return deferred.reject(CollectionError.create('find(:id)', 'unknown -- ' + error.name, 'A technical error occured. Check original error for further details', error));
      }

      deferred.resolve(_.map(result.rows, function (item) {
        return self._convertFromPouch(item.doc);
      }));
    });

  return deferred.promise;
};

PouchAdapter.prototype._findByQuery = function (query) {
  var self = this;

  return this._findAll()
    .then(function (results) {
      return _.filter(results, self._matchFunction(query));
    });
};

PouchAdapter.prototype._addItemRelations = function (items) {

  var self = this;

  function fetchHasManyRelations (item) {
    return _.map(self.collection.schema.hasMany, function (connection, name) {

      var keys = item[name + '_ids'];
      if (_.isEmpty(keys)) {
        return;
      }

      return connection.find()
        .then(function (relations) {
          item[name] = _.filter(relations, function (relation) {
            return _.include(keys, relation.id);
          });
          return item;
        });
    });
  }

  function fetchHasOneRelations (item) {
    return _.map(self.collection.schema.hasOne, function (connection, name) {

      var key = item[name + '_id'];
      if (_.isUndefined(key)) {
        return;
      }

      return connection.find(key)
        .then(function (relation) {
          item[name] = relation;
        });
    });
  }

  var promises = [];

  _.each(items, function (item) {
    promises.push.apply(promises, fetchHasManyRelations(item));
    promises.push.apply(promises, fetchHasOneRelations(item));
  });

  return q.all(promises)
    .then(function () {
      return items;
    });
};

// // ------------------------------------------------------------ Inserts
// // ------------------------------------------------------- store
// /**
//  *
//  * @description
//  *   Stores one or multiple items using this PouchDB adapter.
//  *
//  * @argument items
//  *   Either a single or an array of items. If the item has an id
//  *   it will be updated, if no id can be found a new item will be created.
//  *
//  */
// PouchAdapter.prototype.store = function (items) {
//   return _.isArray(items) ?
//     _storeMany(this.pouch, this.collection.schema, items) :entry.
//   // First store all fields that have been defined as hasMany or hasOne
//   // relations. After that store the item itself.
//   //
//   return _storeItemRelations(schema, item)

//     //
//     // Stashes all full relation-fields, storing only the id-pointers
//     // instead, e.g.:
//     //
//     // Instead of the persisting the full item set:
//     //   { myItems: [{ id: '123', ... }, { id: '234', .. }] }
//     //
//     // only the corresponding id-pointer field (created by _storeItemRelations):
//     //   { _myItems_ids: ['123', '234'] }
//     //
//     // will be persisted.
//     //
//     .then(function storeItem (item) {
//       var relations = _.pick(item, schema._relations);

//       item = _.omit(item, schema._relations);

//       var promise = item.id ?
//         _updateOne(pouch, schema, item) :
//         _createOne(pouch, schema, item);

//       // After the DB update reapply the related items, that have been persisted
//       // in the _storeItem Relations step.
//       return promise.then(function reapplyRelations (item) {
//         return _.merge(item, relations);
//       });
//     });
// }


// //
// // TODO: Performance could propably be improved by storing
// //       multiple elements in a batch operation.
// //       For now, I prefer the simple store one-by-one solution
// //       for simplicity reasons.
// //
// function _storeMany (pouch, schema, items) {

//   function iterate () {
//     return _.map(items, function (item) {
//       return _storeOne(pouch, schema, item);
//     });
//   }

//   return q.all(iterate());
// }

// function _createOne (pouch, schema, item) {
//   var deferred = q.defer();

//   item = _.defaults(item, schema._defaults);

//   pouch.post(item, function (error, result) {
//     if (error) {
//       return deferred.reject(_formatError('store(:new)', 'unknown -- ' + error.name, 'A technical error occured. Check original error for further details', error));
//     }
//     deferred.resolve(_convertFromPouch(_.merge(item, result)));
//   });

//   return deferred.promise;
// }

// function _updateOne (pouch, schema, item) {
//   var deferred = q.defer();

//   item = _.defaults(item, schema._defaults);

//   function update (pouch, item) {
//     pouch.put(_convertToPouch(item), function (error, result) {
//       result = _convertFromPouch(result);

//       if (error && error.name === 'conflict') {
//         return deferred.reject(_formatError('store(:existing)', 'conflict', 'There was a conflict storing an existing item. An item with a newer revision already exists.', error));
//       }
//       else if (error) {
//         return deferred.reject(_formatError('store(:existing)', 'unknown -- ' + error.name, 'A technical error occured. Check original error for further details', error));
//       }
//       return deferred.resolve(_.merge(item, result));
//     });
//   }
//   _findOne(pouch, schema, item.id)
//     .then(function (existing) {
//       if (_.isEqual(item, existing, true)) {
//         return deferred.resolve(item);
//       }
//       return update(pouch, item);
//     });

//   return deferred.promise;
// }


// PouchAdapter.prototype._filterUpdated = function (items) {
//   var deferred = q.defer();
//   this.pouch.allDocs(function (error, response) {
//     deferred.resolve(_.map(items, function (item) {
//       return _.isEqual(item, response.map(item.id), true);
//     }));
//   });
//   return deferred.promise;
// };

// PouchAdapter.prototype._storeMany = function (items) {
//   var self = this;
//   this._update
//   this._filterUpdated(items)
//     .then(function (items) {
//       self.pouch.bulkDocs(_.map(items, _convertToPouch),

// // ------------------------------------------------------------ Lookups
// // ------------------------------------------------------- find
// PouchAdapter.prototype.find = function (id) {
//   var query = arguments.length ? arguments[0] : null;

//   var self = this;

//   if (_.isEmpty(query) || id === 'all') {
//     return _findAll(this.pouch, this.options.query);name === 'not_found') {
//       return deferred.reject(_formatError('find(:id)', 'not-found', 'No item found for the given id', error));
//     }
//     else if (error) {
//       return deferred.reject(_formatError('find(:id)', 'unknown -- ' + error.name, 'A technical error occured. Check original error for further details', error));
//     }

//     deferred.resolve(_convertFromPouch(item));
//   });

//   return deferred.promise
//     .then(function (item) {
//       return _fetchItemRelations(item, schema);
//     });
// }

// function _findAll (pouch) {
//   var deferred = q.defer();

//   pouch.allDocs({ include_docs: true }, function (error, result) {
//     if (error) {
//       return deferred.reject(_formatError('find(:id)', 'unknown -- ' + error.name, 'A technical error occured. Check original error for further details', error));
//     }


//     deferred.resolve(_.map(result.rows, function (item) {
//       return _convertFromPouch(item.doc);
//     }));
//   });

//   return deferred.promise;
// }

// function _findByQuery (pouch, query, options) {
//   return _findAll(pouch)
//     .then(function (results) {
//       return _.filter(results, _matchFunction(query));
//     });

//   // var deferred = q.defer();

//   // pouch.query(_matchFunction(query), options, function (error, result) {
//   //   if (error) {
//   //     return deferred.reject(_formatError(error));
//   //   }
//   //   return deferred.resolve(_.map(result.rows, function (row) {
//   //     return _convertFromPouch(row.doc);
//   //   }));
//   // });

//   // return deferred.promise;
// }

// function _fetchItemRelations(item, schema) {

//   function fetchHasManyRelations () {
//     return _.map(schema.hasMany, function (connection, name) {

//       var keys = item[name + '_ids'];
//       if (_.isEmpty(keys)) {
//         return;
//       }

//       return connection.find()
//         .then(function (relations) {
//           item[name] = _.filter(relations, function (relation) {
//             return _.include(keys, relation.id);
//           });
//           return item;
//         });
//     });
//   }

//   function fetchHasOneRelations () {
//     return _.map(schema.hasOne, function (connection, name) {

//       var key = item[name + '_id'];
//       if (!_.isUndefined(key)) {
//         return;
//       }

//       return connection.find(key)
//         .then(function (relation) {
//           item[name] = relation;
//         });
//     });
//   }

//   var promises = [];

//   promises.push.apply(promises, fetchHasManyRelations(item));
//   promises.push.apply(promises, fetchHasOneRelations(item));

//   return q.all(promises)
//     .then(function () {
//       return item;
//     });
// }


// // ------------------------------------------------------------ Deletion
// // ------------------------------------------------------- empty
// PouchAdapter.prototype.empty = function () {
//   var pouch = this.pouch;

// // ------------------------------------------------------------ Deletion
// // ------------------------------------------------------- delete
// PouchAdapter.prototype.remove = function () {
//   var args = _.toArray(arguments);
//   var query = args.length === 1 ? _.first(args) : args;

//   if (_.isArray(query)) {
//     return _removeBulk(this.pouch, query); === 'conflict') {
//       return deferred.reject(_formatError('remove(:item)', 'not-found', 'No item found matching the given item', error));
//     }
//     else if (error) {
//       return deferred.reject(_formatError('remove(:item)', 'unknown -- ' + error.name, 'A technical error occured. Check original error for further details', error));
//     }

//     return deferred.resolve(_.omit(item, 'id', 'ok','rev'));
//   });

//   return deferred.promise;
// }

// function _removeBulk (pouch, items) {
//   var deferred = q.defer();

//   items = _.map(items, function (item) {
//     item._deleted = true;
//     return _convertToPouch(item);
//   });

//   pouch.bulkDocs(items, function (error, response) {
//     if (error) {
//       return deferred.reject(_formatError('remove(:all)', 'unknown -- ' + error.name, 'A technical error occured. Check original error for further details', error));
//     }

//     return deferred.resolve({ ok: true });
//   });

//   return deferred.promise;
// }

// function _removeQuery (pouch, query) {
//   var deferred = q.defer();

//   function removeAllItems (items) {
//     q.all(_.map(items, function (item) {
//       return _removeOne(pouch, item);
//     }))
//       .then(function () {
//         deferred.resolve(_.map(items, function (item) {
//           return _.omit(item, ['id', 'ok', 'rev']);
//         }));
//       })
//       .catch(function (error) {
//         return deferred.reject(_formatError('remove(:query)', 'unknown -- ' + error.name, 'A technical error occured. Check original error for further details', error));
//       });
//   }

//   _findByQuery(pouch, query)
//     .then(removeAllItems);

//   return deferred.promise;
// }


// ----------------------------------------------------------------- Private helpers
// ------------------------------------------------------------
// -------------------------------------------------------
PouchAdapter.prototype._convertFromPouch = function (items) {

  var self = this;

  function iterate (item) {

    item = _.cloneDeep(item);

    // Bulk operations will return 'id', find operations will return '_id'
    item.id = item._id || item.id;
    // Bulk operations will return 'rev', find operations will return '_rev'
    item.rev = item._rev || item.rev;

    return _.omit(item, ['_id', '_rev', 'ok']);
  }

  return _.isArray(items) ? _.map(items, iterate) : iterate(items);
};

PouchAdapter.prototype._convertToPouch = function (items) {

  function iterate (item) {

    item = _.cloneDeep(item);

    if (item.id) {
      item._id = item.id;
    }
    if (item.rev) {
      item._rev = item.rev;
    }

    return _.omit(item, ['id', 'rev', 'ok']);
  }


  return _.isArray(items) ? _.map(items, iterate) : iterate(items);
};

/**
 * @description
 *  Recursive callback-function for the PouchDB query function.
 *
 * @returns function match ()
 *  Returns a function to be called by the PouchDB query function.
 *  On callback matches each doc in the collection against the provided
 *  query object. Adds docs to the result that equal the provided query
 *  for each attribute in the query object.
 *  Model attributes not presetn in the query object will be ignored
 *  i.e., not using full equal).
 *
 */
PouchAdapter.prototype._matchFunction = function (query) {

  function matchRecursive (item, query) {
    return _.reduce(query, function (result, value, key){
      var itemValue = item[key];
      if (_.isObject(value)) {
        return result && _.isObject(itemValue) && matchRecursive(itemValue, value);
      }
      return result && _.isEqual(itemValue, value);
    }, true);
  }

  return function match (item) {
    return matchRecursive(item, query);
  };
};

function checkForErrors (responses) {
  responses = _.isArray(responses) ? responses : [responses];

  for (var i=0; i<responses.length; ++i) {
    var response = responses[i];

    if (response.error) {
      switch (response.status) {
        case 409:
          return CollectionError.create('ShelfDocumentUpdateConflict', response.message, response);
      }
    }
  }

  return false;
}

module.exports = PouchAdapter;