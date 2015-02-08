/* jshint node:true */
'use strict';

// ----------------------------------------------------------------- Initialization
// ------------------------------------------------------------ Dependencies
// -------------------------------------------------------
var q = require('q');
var _ = require('lodash');
var Adapter;

console.info('Loading connection adapter.');

try {
  console.info('Attempting to load shelf-minimongo... ');
  Adapter = require('./adapters/shelf-minimongo.js');
  console.info(' ... success');
} catch (e) {
  console.info(' ...failed');
}

try {
  console.info('Attempting to load shelf-pouchdb... ');
  Adapter = require('./adapters/shelf-pouchdb.js');
  console.info(' ... success');
} catch (e) {
  console.info(' ...failed');
}


// ------------------------------------------------------------ Object creation
// ------------------------------------------------------- Constructor
function Collection (collectionName, options) {

  this.name = collectionName;

  this.schema = {
    hasMany: {},
    hasOne: {}
  };

  this.options = options;

  this.adapter = new Adapter(this);
}

// ------------------------------------------------------- Static
Collection._dbs = {};
Collection.load = function (collectionName, options) {
  var collection = Collection._dbs[collectionName];

  if (!collection) {
    collection = new Collection(collectionName, options);
    Collection._dbs[collectionName] = collection;
  }

  return collection;
};



// ------------------------------------------------------- Definitions
Collection.Events = ['create', 'update', 'delete', 'error', 'conflict'];

Collection.Event = function () {
  // ...
};


// ------------------------------------------------------- Globals
Collection.prototype._nonCommmitableKeys = ['_id', '_rev', 'Collection'];


// ----------------------------------------------------------------- Public interface
// ------------------------------------------------------------ Definition
// ------------------------------------------------------- Schema
// Sets the schema for the collection. Will be used
// for validation and attribute picking
Collection.prototype.schema = function (schema) {
  this.schema = _.extend(this.schema, schema);
};


// -------------------- Relations
// Notifies collection of a one-to-many relation
Collection.prototype.hasMany = function (fieldName, collectionName) {
  collectionName = arguments.length === 1 ? fieldName : collectionName;
  this.schema.hasMany[fieldName] = Collection.load(collectionName, this._options);

  this.adapter.setSchema(this.schema);

  return this.schema.hasMany[fieldName];
};

// Notifies collection of a many-to-one relation
Collection.prototype.hasOne = function (fieldName, collectionName) {
  collectionName = arguments.length === 1 ? fieldName : collectionName;
  this.schema.hasOne[fieldName] = Collection.load(collectionName, this._options);

  this.adapter.setSchema(this.schema);

  return this.schema.hasOne[fieldName];
};


// ------------------------------------------------------------ Data Manipulation
// ------------------------------------------------------- Inserts

/**
 * @description
 *  Insertion method for this collection.
 *  Will allow intertions for items using various methods:
 *
 *  Methods supported:
 *   store(:new)             - Creates an item not yet persisted. Must create
 *                             id and rev fields to uniquely identify the identity
 *                             and revision of the newly created item within
 *                             this collection.
 *   store(:existing)        - Updates an item that already has an id and rev, updating
 *                             the revision pointer in the process.
 *   store([:item])          - Creates or updates all items in the given array.
 *
 */
Collection.prototype.store = function () {
  var adapter = this.adapter;

  return adapter.store.apply(adapter, arguments);
};


// ------------------------------------------------------- Lookups

/**
 * @description
 *  Lookup method for this collection.
 *  Will allow lookups of items using various methods:
 *
 *  Methods supported:
 *   find()                  - Returns all elements in this collection.
 *   find('all')             - Synonymn for find().
 *   find('idstring')        - Returns exactly one item for the given id.
 *                           - Returns an erroneus response if no item found
 *                             for this id.
 *   find({ *queryobject* }) - Return an array of all items in this collection that match
 *                             the given query.
 *                           - The query can be a simple object, e.g., { key: 'value' }
 *                           - or a nested object
 *                           - Returns an empty array if no objects match the query.
 */
Collection.prototype.find = function () {
  var adapter = this.adapter;
  return adapter.find.apply(adapter, arguments);
};


// ------------------------------------------------------- Deletions
Collection.prototype.remove = function () {
  var adapter = this.adapter;
  return adapter.remove.apply(adapter, arguments);
};


// ------------------------------------------------------- Clear database
Collection.prototype.empty = function () {
  var adapter = this.adapter;
  return adapter.empty.apply(adapter, arguments);
};


// ------------------------------------------------------------ Event Handling
// ------------------------------------------------------- Subscription
Collection.prototype.on = function () {

};

Collection.prototype.off = function () {

};

module.exports = {
  load: Collection.load
};