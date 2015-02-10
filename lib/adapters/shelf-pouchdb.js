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
  this.listeners = {
    create: {},
    update: {},
    delete: {},
    change: {},
    complete: {},
    error: {}
  };

  this.pouch = new PouchDB(collection.name, options);
}

// // ------------------------------------------------------------ Inserts
// // ------------------------------------------------------- store
PouchAdapter.prototype.store = function (items) {

  var self = this;
  var expectSingleResult = !_.isArray(items);

  //
  items = expectSingleResult ? [items] : items;


  //
  // 1. Store all relations attached to the
  //    items to be persisted. Will generate
  //    the id by which this item can reference them.
  //
  //    Will return a processed set of item(s)
  //    coupled to their relations.
  //
  // console.log('1.', items);
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
      // console.log('2.', data);
      return self._separateItemAndRelations(data);
    })
    .then(function (mappedData) {
      //
      // 3. Stash separated item and relations for later use
      //
      // console.log('3.', mappedData);
      stashed = mappedData;
      return stashed.items;
    })
    .then(function (items) {
      //
      // 4. Test if item to be stored has changed in case
      //    of an update operation. Only changed items
      //    will be stored again (esp. limiting inflating the
      //    revs count on related items)
      //
      // console.log('4.', items);
      return self._markChangedItems(items);
    })
    .then(function (items) {
      //
      // 5. Stash the marked-items in a variable for later use.
      //
      // console.log('5.', items);
      markedItems = items;
      return markedItems;
    })
    .then(function (markedItems) {
      //
      // 6. Filter only values that are marked for change.
      //    Only those will be added to the db in the next step.
      //
      // console.log('6.', markedItems);
      return _.compact(_.map(markedItems, function (marked) {
        return marked.changed ? marked.item : undefined;
      }));
    })
    .then(function (itemsToStore) {
      //
      // 7. Store changed items.
      //    At this point items will reference their
      //    relations only by id. Their information has
      //    been already been stored in a separate step (1.)
      //
      // console.log('7.', itemsToStore);
      return self.pouch.bulkDocs(self._convertToPouch(itemsToStore));
    })
    .then(function (response)  {
      //
      // 8. Some errors are not thrown by pouch but
      //    rather returned in the response.
      //    Look for errors and throw them in case of an
      //    invalid response.
      //
      // console.log('8.', response);
      var error = convertToShelfExeption(response);
      if (error) {
        return q.reject(error);
      }
      return response;
    })
    .then(function (response)  {
      //
      // 9. Merge recently updated and unchanged items
      //    back together to allow for a consistent response.
      //
      // console.log('9.', response);
      var index = 0;
      return _.map(markedItems, function (marked) {
        return marked.changed ? response[index++] : marked.item;
      });
    })
    .then(function (updated) {
      //
      // 10. Reassemble items, their relations and the updated
      //     versioning information (id, rev) obtained from
      //     the storage operation
      //
      // console.log('10.', updated);
      return self._mergeItemAndRelations(stashed.items, stashed.relations, updated);
    })
    .then(function (items) {
      //
      // 11. Return data in the expected format
      //
      // console.log('11.', items);
      return expectSingleResult ? _.first(items) : items;
    })
    .catch(function (error) {
      throw convertToShelfExeption(error);
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
    })
    .catch(function (error) {
      throw convertToShelfExeption(error);
    });
};

PouchAdapter.prototype._findOne = function (id) {
  var self = this;

  return this.pouch.get(id, { include_docs: true })
    .then(function (item) {
      return self._convertFromPouch(item);
    })
    .catch(function (error) {
      return q.reject(convertToShelfExeption(error));
    });
};

PouchAdapter.prototype._findBulk = function (ids) {
  var self = this;

  var promises = _.map(ids, function (id) {
    return self.pouch.get(id, { include_docs: true })
      .then(function (item) {
        return self._convertFromPouch(item);
      })
      .catch(function (error) {
        return q.reject(convertToShelfExeption(error));
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

// ------------------------------------------------------- Relations
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


// // ------------------------------------------------------------ Deletion
// // ------------------------------------------------------- empty
PouchAdapter.prototype.empty = function () {
  var self = this;

  return this.pouch.allDocs()
    .then(function (response) {
      var docs = _.map(response.rows, function (row) {
        return {
          id: row.id,
          rev: row.value.rev,
        };
      });

      return self._removeBulk(docs);
    })
    .catch(function (error) {
      throw convertToShelfExeption(error);
    });
 };

// ------------------------------------------------------- remove
PouchAdapter.prototype.remove = function (query) {
  if (_.isObject(query) && !_.isArray(query)) {
    return this._removeByQuery(query);
  }

  return this._removeBulk(_.isArray(query) ? query : [query])
    .catch(function (error) {
      throw convertToShelfExeption(error);
    });
};

PouchAdapter.prototype._removeByQuery = function (query) {
  var self = this;
  return this._findByQuery(query)
    .then(function (items) {
      return self._removeBulk(items);
    });
};

PouchAdapter.prototype._removeBulk = function (items) {
  var pouch = this.pouch;

  return q.all(_.map(items, function (item) {
    return pouch.remove(item.id, item.rev);
  }));
};


// ----------------------------------------------------------------- Event handlers
// ------------------------------------------------------------
// -------------------------------------------------------
PouchAdapter.prototype.on = function (event, callback) {
  this.listeners[event][callback] = this.pouch.changes({
    since: 'now'
  }).on(event, callback);
};

PouchAdapter.prototype.off = function (event, callback) {
  if (callback) {
    this.listeners[event][callback].cancel();
  }
  else if (event) {
    _.each(this.listeners[event], function (listener) {
      listener.cancel();
    });
  }
};


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

function convertToShelfExeption (responses) {
  responses = _.isArray(responses) ? responses : [responses];

  for (var i=0; i<responses.length; ++i) {
    var response = responses[i];

    if (response.error) {
      switch (response.status) {
        case 404:
          return CollectionError.create('ShelfDocumentNotFoundConflict', response.message, response);
        case 409:
          return CollectionError.create('ShelfDocumentUpdateConflict', response.message, response);
        default:
          return CollectionError.create('ShelfGenericErrorException', response.message, response);
      }
    }
  }
}

module.exports = PouchAdapter;