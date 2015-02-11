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

  this.options = _.merge({}, options);

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

  return this.schema.hasMany[fieldName];
};

// Notifies collection of a many-to-one relation
Collection.prototype.hasOne = function (fieldName, collectionName) {
  collectionName = arguments.length === 1 ? fieldName : collectionName;
  this.schema.hasOne[fieldName] = Collection.load(collectionName, this._options);

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
  return this.adapter.store.apply(this.adapter, arguments);
};


// ------------------------------------------------------- Lookups

/**
 * @description
 *  Lookup method for this collection.
 *  Will allow lookups of items using various query methods:
 *
 *  Methods supported:
 *   find()                  - Returns all elements in this collection.
 *   find({})                - Equivalent to find().
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
  return this.adapter.find.apply(this.adapter, arguments);
};



/**
 * @description
 *  Will return all items currently stored in this collection.
 *  Equivalent to find()
 *
 *  Methods supported:
 *   findAll()              - Returns all elements in this collection.
 *
 */
Collection.prototype.findAll = function () {
  return this.adapter.findAll.apply(this.adapter, arguments);
};


// ------------------------------------------------------- Deletions
Collection.prototype.remove = function () {
  return this.adapter.remove.apply(this.adapter, arguments);
};


// ------------------------------------------------------- Clear database
Collection.prototype.empty = function () {
  return this.adapter.empty.apply(this.adapter, arguments);
};


// ------------------------------------------------------------ Event Handling
// ------------------------------------------------------- Subscription
Collection.prototype.on = function () {
  return this.adapter.on.apply(this.adapter, arguments);
};

Collection.prototype.off = function () {
  return this.adapter.off.apply(this.adapter, arguments);
};

module.exports = {
  load: Collection.load
};