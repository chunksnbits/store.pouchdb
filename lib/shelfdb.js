/* jshint node:true */
'use strict';

// ----------------------------------------------------------------- Initialization
// ------------------------------------------------------------ Dependencies
// ------------------------------------------------------- Vendor
var _ = require('lodash');
var q = require('q');

// ------------------------------------------------------- Core
var ModelInstance = require('./core/model-instance');
var Server = require('./core/server.js');
var ValidationService = require('./core/validations');

// ------------------------------------------------------- Adapter
var Adapter = require('./adapter/pouch')(options);

// ------------------------------------------------------- Config
var options = require('../config/shelfdb.config.json');

// ------------------------------------------------------------ Object creation
// ------------------------------------------------------- Constructor
function ShelfDb (pouch, schema) {

  this._name = pouch._db_name;
  this._adapter = new Adapter(this, pouch);

  this.schema(schema);
}

// ------------------------------------------------------- Static loader
ShelfDb.load = function (pouch, schema) {
  return new ShelfDb(pouch, schema);
};


// ----------------------------------------------------------------- Public interface
// ------------------------------------------------------------ Definition
// ------------------------------------------------------- Schema
/**
 * @description
 *   Sets the schema definition for this collection.
 *   This schema will be used for this collection's schema validation.
 *
 * @params:
 *   [schema]: The schema to set. Can hold any of the following settings:
 *             - properties: The properties of this collection. Will be used
 *                           for validation (see property for possible settings).
 *             - hasMany: A one-to-many relation to another collection. The
 *                        related collection  can be provided as a collection
 *                        object or by name,
 *             - hasOne: A one-to-one relation to another collection. The
 *                       related collection can be provided as a collection
 *                       object or by name,
 *
 * @returns:
 *   [collection]: This collection updated with the given schema definition.
 */
 ShelfDb.prototype.schema = function (schema) {

  // Set initial empty validation
  this._schema = {
    hasMany: {},
    hasOne: {},
    properties: {}
  };

  if (!schema) {
    return;
  }

  _.each(schema.properties, function (validation, name) {
    this.property(name, validation);
  }, this);

  //
  // Make sure to initialize collections for relations,
  // in case relations were provided by name,
  //
  _.each(schema.hasOne, function (collection, name) {
    this.hasOne.call(this, name, collection);
  }, this);

  _.each(schema.hasMany, function (collection, name) {
    this.hasMany.call(this, name, collection);
  }, this);

  return this;
};


// ------------------------------------------------------- Properties
/**
 * @description
 *   Adds a new property schema definition to this collection.
 *   This property will be part of the this collection's schema validation.
 *
 * @params:
 *   [name]: The name of the property to add.
 *   [schema]: The schema to validate for the property to add.
 *             Allows the following specifications:
 *              * type: One of: string, number, boolean, date, object, array
 *                      (default: any)
 *              * required: Requires the property to be not empty (default false)
 *              * validate: a regex pattern or valdiation function to validate
 *                          the property with (default: undefined)
 *
 * @returns:
 *   [collection]: This collection updated with an extended schema definition.
 */
ShelfDb.prototype.property = function (name, schema) {
  var validation = schema;

  if (_.isString(schema)) {
    validation = { type: schema };
  } else if (_.isFunction(schema)) {
    validation = { validate: schema };
  }

  this._schema.properties[name] = validation;

  return this;
};


// ------------------------------------------------------- Relations
/**
 *  @description
 *    Adds a one-to-many relation to this collection.
 *    Related items will be:
 *      * handled as independent entities, i.e., have their own id and rev
 *      * will be automatically synced with their corresponding collection,
 *        when their parent item is saved
 *      * able to be handled independently from the collection they are assigned
 *        i.e., can be manipulated / stored without making changes to the parent
 *        entity
 *
 * @params:
 *   [name]: The name of the relation. This is how the relation will be
 *           identified when storing / restoring the parent item.
 *           If no collectionName parameter is provided the name will also be
 *           assumed to be the name of the related collection.
 *   [collectionName]: (Optional) The name for the related collection, in cases
 *                     the field name and collectionName differ.
 *
 * @returns:
 *   [collection]: This collection updated with the given relation.
 */
ShelfDb.prototype.hasMany = function (name, collection) {
  collection = arguments.length === 1 ? name : collection;

  if (_.isString(collection)) {
    collection = ShelfDb.load(Adapter.load(collection, this._adapter.pouch.__opts));
  }

  this._schema.hasMany[name] = collection;

  return this;
};

/**
 *  @description
 *    Adds a one-to-one relation to this collection.
 *    Related items will be:
 *      * handled as independent entities, i.e., have their own id and rev
 *      * will be automatically synced with their corresponding collection,
 *        when their parent item is saved
 *      * able to be handled independently from the collection they are assigned
 *        i.e., can be manipulated / stored without loading and / or making
 *        changes to the parent entity
 *
 * @params:
 *   [name]: The name of the relation. This is how the relation will be
 *           identified when storing / restoring the parent item.
 *           If no collectionName parameter is provided the name will also be
 *           assumed to be the name of the related collection.
 *   [collectionName]: (Optional) The name for the related collection, in cases
 *                     the field name and collectionName differ.
 *
 *  @returns:
 *    [collection]: This collection updated with the given relation.
 */
ShelfDb.prototype.hasOne = function (name, collection) {
  collection = arguments.length === 1 ? name : collection;

  if (_.isString(collection)) {
    collection = ShelfDb.load(Adapter.load(collection, this._adapter.pouch.__opts));
  }

  this._schema.hasOne[name] = collection;

  return this;
};

// ------------------------------------------------------------ Data Manipulation
// ------------------------------------------------------- Creation
/**
 * @description
 *  Creation method for this collection.
 *  Creates a new model instance. If any data is provided, the newly created
 *  model instance will hold this data.
 *
 * @params:
 *  [data]: (Optional) The initial data for the newly created model instance.
 *
 * @returns:
 *  [ModelInstance]: A new model instance.
 */
ShelfDb.prototype.new = function (data) {
  return new ModelInstance(this, data);
};


/**
 * @description
 *  Creates a new model instance. If any data is provided
 *
 * @params:
 *  [element]: One or many elements to update. The items are expected to
 *             have a valid id and rev.
 *
 * @returns:
 *  [Promise]: A promise that will be resolved once
 *             the item has been updated.
 */
ShelfDb.prototype.store = function (items) {
  var expectsSingleResult = !_.isArray(items) && arguments.length === 1;

  // Convert arguments to array to allow single approach
  // to processing store operation.
  items = this._toArray.apply(this, arguments);
  items = this._convertToSimpleObject(items);

  this._validate(items);

  var self = this;

  return this._adapter.store(items)
    .then(function (storedItems) {
      storedItems = self._convertToModelInstance(storedItems);

      return expectsSingleResult ? _.first(storedItems) : storedItems;
    });
};


// ------------------------------------------------------- Lookups
/**
 * @description
 *  Lookup method for this collection.
 *  Will search for a persisted item matching the given id or query.
 *
 * @params (one of):
 *  [id]: The id by which to identify the item to find.
 *  [query]: The query object to evaluate. This cane be a simple object,
 *           i.e., a map of key-value-pairs or a nested object.
 *
 * @returns:
 *  [Promise]: A promise that on resolution will return exactly the one model
 *             instance that matches the given id.
 *             If no match could be found, the promise will be rejected.
 */
ShelfDb.prototype.find = function () {
  var self = this;

  return this._adapter.find.apply(this._adapter, arguments)
    .then(function (results) {
      return self._convertToModelInstance(results);
    });
};


/**
 * @description
 *  Lookup method for this collection.
 *  Will return all items currently stored in this collection.
 *
 *  Methods supported:
 *   @returns
 *     [Promise]: A promise that on resolution will return all items currently
 *                persisted in this collection.
 *
 */
ShelfDb.prototype.all = function () {
  var self = this;

  return this._adapter.all.apply(this._adapter, arguments)
    .then(function (results) {
      return self._convertToModelInstance(results);
    });
};


// ------------------------------------------------------- Deletions
/**
 * @description
 *  Deletion method for this collection.
 *  Will remove the given item from this collection.
 *
 * @params:
 *   [item(s)]: One or more items to remove from this collection.
 *
 * @returns:
 *   [Promise]: A promise that will be resolved on the operation has been
 *              processed.
 */
ShelfDb.prototype.remove = function (items) {
  return this._adapter.remove.apply(this._adapter, arguments);
};


// ------------------------------------------------------- Clear database
/**
 * @description
 *  Clearance method for this collection.
 *  Will remove all items currently stored in this collection.
 *
 * @returns:
 *  [Promise]: A promise that will be resolved on the operation has been
 *             processed.
 *
 */
ShelfDb.prototype.empty = function () {
  return this._adapter.empty.apply(this._adapter, arguments);
};


// ------------------------------------------------------------ Event Handling
// ------------------------------------------------------- Subscription
ShelfDb.prototype.on = function () {
  return this._adapter.on.apply(this._adapter, arguments);
};

ShelfDb.prototype.off = function () {
  return this._adapter.off.apply(this._adapter, arguments);
};


// ------------------------------------------------------------ Language functions
// ------------------------------------------------------- toString
ShelfDb.prototype.validate = function (items) {

  items = this._toArray(items);

  try {
    this._validate(items);
  } catch (exception) {
    return false;
  }

  return true;
};

ShelfDb.prototype.toString = function () {
  return '[object Collection]';
};


// ----------------------------------------------------------------- Private methods
// ------------------------------------------------------------ Conversion
ShelfDb.prototype._validate = function (items) {
  _.each(items, function (item) {
    ValidationService.validate(item, this._schema.properties);
  }, this);

  return true;
};

ShelfDb.prototype._convertToModelInstance = function (items) {
  if (_.isArray(items)) {
    return _.map(items, function (item) {
      return new ModelInstance(this, item);
    }, this);
  }

  return new ModelInstance(this, items);
};

ShelfDb.prototype._convertToSimpleObject = function (items) {
  function clean (item) {


    item = _.omit(item, _.union(['_collection', '__collection'], _.functions(item)));

    _.each(item, function (value, key) {
      if (_.isObject(value)) {
        item[key] = clean(value);
      }
    });

    return item;
  }

  if (_.isArray(items)) {
    return _.map(items, function (item) {
      return clean(item);
    });
  }

  return clean(items);
};

ShelfDb.prototype._toArray = function (items) {
  if (arguments.length > 1) {
    return _.toArray(arguments);
  }
  return _.isArray(items) ? items : [items];
};

module.exports = ShelfDb;
