/* jshint node:true */
'use strict';

// ----------------------------------------------------------------- Initialization
// ------------------------------------------------------------ Dependencies
// ------------------------------------------------------- Libraries
var q = require('bluebird');
var _ = require('lodash');
var deepEqual = require('deep-equal');
var PouchDb = require('pouchdb');

// ------------------------------------------------------- Core
var ExceptionHandler = require('../core/exception-handler');
var EventHandler = require('./pouch-events');
var Item = require('../core/item');

// ------------------------------------------------------- Internal
var PouchServer = require('./pouch-server');
var PouchSync = require('./pouch-sync');

// ------------------------------------------------------------ Object creation
// ------------------------------------------------------- Constructor
function PouchAdapter (store, pouch) {

  this._store = store;
  this.eventHandler = new EventHandler(this);

  this.pouch = pouch;
}

// ------------------------------------------------------------ PouchStore
// ------------------------------------------------------- Initialization
PouchAdapter.init = function (options) {
  // PouchAdapter.Middleware = PouchServer.createMiddleware(PouchAdapter.PouchDb);

  return PouchAdapter;
};

PouchAdapter.load = function (name, options) {
  return new PouchDb(name, options);
};

// // ------------------------------------------------------------ Inserts
// // ------------------------------------------------------- store
PouchAdapter.prototype.store = function (items) {
  var self = this;

  // console.log('0. store', _.first(items).rev);
  // console.trace();

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
      // 7. Add meta information
      //
      // console.log('7.', itemsToStore);
      return self._extendWithMetaInformation(itemsToStore);
    })
    .then(function (itemsToStore) {
      //
      // 8. Store changed items.
      //    At this point items will reference their
      //    relations only by id. Their information has
      //    been already been stored in a separate step (1.)
      //
      // console.log('8.', itemsToStore);
      return self.pouch.bulkDocs(self._convertToPouch(itemsToStore));
    })
    .then(function (response)  {
      //
      // 9. Some errors are not thrown by pouch but
      //    rather returned in the response.
      //    Look for errors and throw them in case of an
      //    invalid response.
      //
      // console.log('9.', response);
      var error = convertToShelfExeption(response);
      if (error) {
        return q.reject(error);
      }
      return response;
    })
    .then(function (responses)  {
      //
      // 10. Merge recently updated and unchanged items
      //    back together to allow for a consistent response.
      //
      // console.log('10.', responses, markedItems);
      var index = 0;

      return _.map(markedItems, function (marked) {
        if (marked.changed) {
          var response = responses[index++];
          return _.extend(marked.item, {
            id: response.id,
            rev: response.rev
          });
        }
        return marked.item;
      });
    })
    .then(function (updated) {
      //
      // 11. Reassemble items, their relations and the updated
      //     versioning information (id, rev) obtained from
      //     the storage operation
      //
      // console.log('11.', updated);
      return self._mergeItemAndRelations(stashed.items, stashed.relations, updated);
    })
    .catch(function (error) {
      //
      // 12. Capture any exception that pops up
      //     during the pocess and format it
      //     before throwing it up again
      //
      // console.log('13.', error);
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
    if (item.rev) {
      return self._findOne(item.id);
    }

    return q.resolve(undefined);
  }))
    .then(function (storedItems) {
      return _.map(storedItems, function (storedItem, index) {

        // New items will be stored in any case.
        var isChanged = true;
        var item = items[index];

        if (!item.rev && storedItem) {
          item.rev = storedItem.rev;
        }

        // console.log('_markChangedItems');
        // console.log(storedItem);
        // console.log(item);

        if (storedItem) {
          // Filter function: Don't let rev interfer with object
          // value-level comparison.
          isChanged = !deepEqual(storedItem, item);
        }

        // console.log('markChanged', isChanged, storedItem && storedItem.rev, item.rev);

        return {
          changed: isChanged,
          item: isChanged ? item : storedItem
        };
      });
    });
};


// ------------------------------------------------------- Relations
PouchAdapter.prototype._storeItemRelations = function (item) {

  // console.log('_storeItemRelations', this._store._schema);

  var schema = this._store._schema;
  var relations = {};

  function extractIds (docs) {
    return _.map(docs, function (doc) {
      return doc.id;
    });
  }

  function storeHasManyRelation (item) {
    return _.map(schema.hasMany, function (connection, name) {

      var relatedItems = item[name];
      delete item[name];

      if (!_.isObject(relatedItems)) {
        return;
      }

      return connection.store(relatedItems)
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
PouchAdapter.prototype.all = function () {
  return this.find();
};

// // ------------------------------------------------------- find
PouchAdapter.prototype.find = function () {

  var query = arguments.length > 0 ? arguments[0] : null;
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
    })
    .catch(function (error) {
      throw convertToShelfExeption(error);
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
        throw convertToShelfExeption(error);
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
        throw ExceptionHandler.create('ShelfGenericErrorException',
          'A technical error occured. Check original error for further details',
          error);
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
    return _.map(self._store._schema.hasMany, function (connection, name) {

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
    return _.map(self._store._schema.hasOne, function (connection, name) {

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
  var isArray = _.isArray(query);
  var isItem = query instanceof Item;

  if (!isItem && !isArray) {
    return this._removeByQuery(query);
  }

  return this._removeBulk(isArray ? query : [query])
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

// ------------------------------------------------------------ Store synchronization
// ------------------------------------------------------- Setup
PouchAdapter.prototype.sync = function (syncStore, options) {
  return PouchSync.sync(this._store, syncStore, options);
};


// ------------------------------------------------------------ Store server
// ------------------------------------------------------- Setup
PouchAdapter.prototype.listen = function (app, options) {
  return PouchServer.listen(this._store, app, options);
};


// ----------------------------------------------------------------- Event handlers
// ------------------------------------------------------------ Listener registration
// -------------------------------------------------------
PouchAdapter.prototype.on = function () {
  return this.eventHandler.register.apply(this.eventHandler, arguments);
};

PouchAdapter.prototype.off = function () {
  this.eventHandler.unregister.apply(this.eventHandler, arguments);
  return this;
};


// ----------------------------------------------------------------- Private helpers
// ------------------------------------------------------------ Conversions
// ------------------------------------------------------- from pouch
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

// ------------------------------------------------------- to pouch
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

// ------------------------------------------------------------ Pouch callbacks
// ------------------------------------------------------- match
/**
 * @description
 *  Recursive callback-function for the PouchDB query function.
 *
 * @returns function match ()
 *  Returns a function to be called by the PouchDB query function.
 *  On callback matches each doc in the store against the provided
 *  query object. Adds docs to the result that equal the provided query
 *  for each attribute in the query object.
 *  Item attributes not available in the query object will be ignored
 *  (i.e., not using full equal).
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

PouchAdapter.prototype._extendWithMetaInformation = function (items) {

  var self = this;
  var now = Date.now();

  _.each(items, function (item) {
    item.$info = _.merge({
      createdAt: now
    }, item.$info, {
      updatedAt: now,
      store: self._store._name
    });
  });

  return items;
};


// ------------------------------------------------------------ Error Handling
// ------------------------------------------------------- convert pouch errors
function convertToShelfExeption (responses) {
  responses = _.isArray(responses) ? responses : [responses];

  for (var i=0; i<responses.length; ++i) {
    var response = responses[i];
    if (response && response.error) {
      switch (response.status) {
        case 404:
          return ExceptionHandler.create('ShelfDocumentNotFoundConflict', response.message, response);
        case 409:
          return ExceptionHandler.create('ShelfDocumentUpdateConflict', response.message, response);
        default:
          return ExceptionHandler.create('ShelfGenericErrorException', response.message, response);
      }
    }
  }
}

module.exports = function (config) {
  return PouchAdapter.init(config);
};
