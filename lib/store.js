/* jshint node:true */
'use strict';

// ----------------------------------------------------------------- Initialization
// ------------------------------------------------------------ Dependencies
// ------------------------------------------------------- Vendor
var _ = require('lodash');
var q = require('bluebird');

// ------------------------------------------------------- Core
var Item = require('./core/item');
var ValidationService = require('./core/validations');

// ------------------------------------------------------- Adapter
var Adapter = require('./adapter/pouch')(options);

// ------------------------------------------------------- Config
var options = require('../config/shelfdb.config.json');

// ------------------------------------------------------------ Object creation
// ------------------------------------------------------- Constructor
function PouchDbStore (pouch, options) {

  options = _.merge({}, options);

  this._name = pouch._db_name;
  this._adapter = new Adapter(this, pouch);

  this.sync(options.sync, options);
  this.listen(options.listen, options);
  this.schema(options);
}

// ------------------------------------------------------- Static loader
PouchDbStore.load = function (pouch, options) {
  return new PouchDbStore(pouch, options);
};


// ----------------------------------------------------------------- Public interface
// ------------------------------------------------------------ Definition
// ------------------------------------------------------- Schema
/**
 * @description
 *   Sets the schema definition for this store.
 *   This schema will be used for this store's schema validation.
 *
 * @params:
 *   [schema]: The schema to set. Can hold any of the following settings:
 *             - validates: The properties of this store. Will be used
 *                           for validation (see validates for possible settings).
 *             - hasMany: A one-to-many relation to another store. The
 *                        related store  can be provided as a store
 *                        object or by name,
 *             - hasOne: A one-to-one relation to another store. The
 *                       related store can be provided as a store
 *                       object or by name,
 *
 * @returns:
 *   [store]: This store updated with the given schema definition.
 */
 PouchDbStore.prototype.schema = function (schema) {

  // Set initial empty validation
  this._schema = {
    hasMany: {},
    hasOne: {},
    validates: {}
  };

  if (!schema) {
    return;
  }

  _.each(schema.validates, function (validation, name) {
    this.validates.call(this, name, validation);
  }, this);

  //
  // Make sure to initialize stores for relations,
  // in case relations were provided by name,
  //
  _.each(schema.hasOne, function (store, name) {
    this.hasOne.call(this, name, store);
  }, this);

  _.each(schema.hasMany, function (store, name) {
    this.hasMany.call(this, name, store);
  }, this);

  return this;
};


// ------------------------------------------------------- Properties
/**
 * @description
 *   Adds a new validation definition to this store.
 *   This validation will be part of the this store's schema validation.
 *
 * @params:
 *   [name]: The name of the property to apply the validation on.
 *   [schema]: The validation to execute on each create / update of an item.
 *              * type: One of: string, number, boolean, date, object, array
 *                      (default: any)
 *              * required: Requires the property to be not empty (default false)
 *              * validate: a regex pattern or valdiation function to validate
 *                          the property with (default: undefined)
 *
 * @returns:
 *   [store]: This store updated with an extended schema definition.
 */
PouchDbStore.prototype.validates = function (name, schema) {
  var validation = schema;

  if (_.isString(schema)) {
    validation = { type: schema };
  } else if (_.isFunction(schema)) {
    validation = { validate: schema };
  }

  this._schema.validates[name] = validation;

  return this;
};


// ------------------------------------------------------- Relations
/**
 *  @description
 *    Adds a one-to-many relation to this store.
 *    Related items will be:
 *      * handled as independent entities, i.e., have their own id and rev
 *      * will be automatically synced with their corresponding store,
 *        when their parent item is saved
 *      * able to be handled independently from the store they are assigned
 *        i.e., can be manipulated / stored without making changes to the parent
 *        entity
 *
 * @params:
 *   [name]: The name of the relation. This is how the relation will be
 *           identified when storing / restoring the parent item.
 *           If no storeName parameter is provided the name will also be
 *           assumed to be the name of the related store.
 *   [storeName]: (Optional) The name for the related store, in cases
 *                     the field name and storeName differ.
 *
 * @returns:
 *   [store]: This store updated with the given relation.
 */
PouchDbStore.prototype.hasMany = function (name, store) {
  store = arguments.length === 1 ? name : store;

  if (_.isString(store)) {
    store = PouchDbStore.load(Adapter.load(store, this._adapter.pouch.__opts));
  }

  this._schema.hasMany[name] = store;

  return this;
};

/**
 *  @description
 *    Adds a one-to-one relation to this store.
 *    Related items will be:
 *      * handled as independent entities, i.e., have their own id and rev
 *      * will be automatically synced with their corresponding store,
 *        when their parent item is saved
 *      * able to be handled independently from the store they are assigned
 *        i.e., can be manipulated / stored without loading and / or making
 *        changes to the parent entity
 *
 * @params:
 *   [name]: The name of the relation. This is how the relation will be
 *           identified when storing / restoring the parent item.
 *           If no storeName parameter is provided the name will also be
 *           assumed to be the name of the related store.
 *   [storeName]: (Optional) The name for the related store, in cases
 *                     the field name and storeName differ.
 *
 *  @returns:
 *    [store]: This store updated with the given relation.
 */
PouchDbStore.prototype.hasOne = function (name, store) {
  store = arguments.length === 1 ? name : store;

  if (_.isString(store)) {
    store = PouchDbStore.load(Adapter.load(store, this._adapter.pouch.__opts));
  }

  this._schema.hasOne[name] = store;

  return this;
};

// ------------------------------------------------------------ Data Manipulation
// ------------------------------------------------------- Creation
/**
 * @description
 *  Creation method for this store.
 *  Creates a new item. If any data is provided, the newly created
 *  item will hold this data.
 *
 * @params:
 *  [data]: (Optional) The initial data for the newly created item.
 *
 * @returns:
 *  [Item]: A new item.
 */
PouchDbStore.prototype.new = function (data) {
  return new Item(this, data);
};



/**
 * @description
 *  Creates a new item. If any data is provided
 *
 * @params:
 *  [element]: One or many elements to update. The items are expected to
 *             have a valid id and rev.
 *
 * @returns:
 *  [Promise]: A promise that will be resolved once
 *             the item has been updated.
 */
PouchDbStore.prototype.store = function (items) {
  var expectsSingleResult = !_.isArray(items) && arguments.length === 1;

  // Convert arguments to array to allow single approach
  // to processing store operation.
  items = this._toArray.apply(this, arguments);

  // Store simple objects separately to ensure we can update
  // existing items correctly
  var convertedItems = this._convertToSimpleObject(items);
  this._validate(convertedItems);

  var self = this;

  return this._adapter.store(convertedItems)
    .then(function (storedItems) {
      storedItems = _.map(storedItems, function (item, index) {

        // Make sure object identify is kept, while
        // when dealing with items
        if (items[index] instanceof Item) {
          return _.extend(items[index], item);
        }
        else {
          return self._convertToItem(item);
        }
      });

      return expectsSingleResult ? _.first(storedItems) : storedItems;
    });
};


// ------------------------------------------------------- Lookups
/**
 * @description
 *  Lookup method for this store.
 *  Will search for a persisted item matching the given id or query.
 *
 * @params (one of):
 *  [id]: The id by which to identify the item to find.
 *  [query]: The query object to evaluate. This cane be a simple object,
 *           i.e., a map of key-value-pairs or a nested object.
 *
 * @returns:
 *  [Promise]: A promise that on resolution will return exactly the one
 *             item that matches the given id.
 *             If no match could be found, the promise will be rejected.
 */
PouchDbStore.prototype.find = function () {
  var self = this;

  return this._adapter.find.apply(this._adapter, arguments)
    .then(function (results) {
      return self._convertToItem(results);
    });
};


// ------------------------------------------------------- Deletions
/**
 * @description
 *  Deletion method for this store.
 *  Will remove the given item from this store.
 *
 * @params:
 *   [item(s)]: One or more items to remove from this store.
 *
 * @returns:
 *   [Promise]: A promise that will be resolved on the operation has been
 *              processed.
 */
PouchDbStore.prototype.remove = function (items) {
  return this._adapter.remove.apply(this._adapter, arguments);
};


// ------------------------------------------------------------ Store sync
// ------------------------------------------------------- Setup
PouchDbStore.prototype.sync = function () {
  this._sync = this._sync || this._adapter.sync.apply(this._adapter, arguments);
  return this._sync;
};


// ------------------------------------------------------------ Store server
// ------------------------------------------------------- Setup
PouchDbStore.prototype.listen = function () {
  return this._adapter.listen.apply(this._adapter, arguments);
};


// ------------------------------------------------------------ Event Handling
// ------------------------------------------------------- Subscription
PouchDbStore.prototype.on = function () {
  return this._adapter.on.apply(this._adapter, arguments);
};

PouchDbStore.prototype.off = function () {
  return this._adapter.off.apply(this._adapter, arguments);
};


PouchDbStore.prototype.toString = function () {
  return '[object Store]';
};


// ----------------------------------------------------------------- Private methods
// ------------------------------------------------------------ Conversion
PouchDbStore.prototype._validate = function (items) {
  _.each(items, function (item) {
    ValidationService.validate(item, this._schema.validates);
  }, this);

  return true;
};

PouchDbStore.prototype._convertToItem = function (items) {
  if (_.isArray(items)) {
    return _.map(items, function (item) {
      return new Item(this, item);
    }, this);
  }

  return new Item(this, items);
};

PouchDbStore.prototype._convertToSimpleObject = function (items) {

  function clean (item) {

    if (!_.isObject(item)) {
      return item;
    }

    // Omit internal fields
    item = _.omit(item, _.union(['_store', '__store'], _.functions(item)));

    // Don't process items, that are already being processed
    // any further. Prevents circular processing.
    if (item.__marked) {
      return item;
    }

    // Prevent circular processing by marking items currently processed.
    item.__marked = true;

    _.each(item, function (value, key) {
      if (_.isObject(value) && !_.isArray(value)) {
        item[key] = clean(value);
      }
      else if (_.isArray(value)) {
        item[key] = _.map(value, function (current) {
          return clean(current);
        });
      }
    });

    // Remove processing marker again.
    delete item.__marked;

    return item;
  }

  if (_.isArray(items)) {
    return _.map(items, function (item) {
      return clean(item);
    });
  }

  return clean(items);
};

PouchDbStore.prototype._toArray = function (items) {
  if (arguments.length > 1) {
    return _.toArray(arguments);
  }
  return _.isArray(items) ? items : [items];
};

module.exports = PouchDbStore;
