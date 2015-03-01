/* jshint node:true */
'use strict';

// ----------------------------------------------------------------- Initialization
// ------------------------------------------------------------ Dependencies
// ------------------------------------------------------- Vendor
var _ = require('lodash');
var q = require('q');

// ------------------------------------------------------- Internal
var options = require('../config/shelfdb.config.json');

var Adapter = require('./adapter.js')(options);
var Server = require('./server.js');

// ------------------------------------------------------------ Object creation
// ------------------------------------------------------- Constructor
function ShelfDb (collectionName, options) {

  this.name = collectionName;

  this.schema = {
    hasMany: {},
    hasOne: {}
  };

  this.options = _.merge({}, options);

  this.adapter = new Adapter(this);
}

// ------------------------------------------------------- Static loader
ShelfDb._dbs = {};
ShelfDb.load = function (collectionName, options) {

  options = _.merge({}, options);

  var collection = ShelfDb._dbs[collectionName];

  if (!collection) {
    collection = new ShelfDb(collectionName, options);
    ShelfDb._dbs[collectionName] = collection;
  }

  return collection;
};

// ------------------------------------------------------- Server
ShelfDb.Server = Server.init(Adapter.Middleware, options);


// ----------------------------------------------------------------- Public interface
// ------------------------------------------------------------ Definition
// ------------------------------------------------------- Schema
// Sets the schema for the collection. Will be used
// for validation and attribute picking
ShelfDb.prototype.schema = function (schema) {
  this.schema = _.extend(this.schema, schema);
};


// -------------------- Relations
// Notifies collection of a one-to-many relation
ShelfDb.prototype.hasMany = function (fieldName, collectionName) {
  collectionName = arguments.length === 1 ? fieldName : collectionName;
  this.schema.hasMany[fieldName] = ShelfDb.load(collectionName, this._options);

  return this.schema.hasMany[fieldName];
};

// Notifies collection of a many-to-one relation
ShelfDb.prototype.hasOne = function (fieldName, collectionName) {
  collectionName = arguments.length === 1 ? fieldName : collectionName;
  this.schema.hasOne[fieldName] = ShelfDb.load(collectionName, this._options);

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
ShelfDb.prototype.store = function () {
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
ShelfDb.prototype.find = function (query) {
  return this.adapter.find(query);
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
ShelfDb.prototype.findAll = function () {
  return this.adapter.findAll.apply(this.adapter, arguments);
};


// ------------------------------------------------------- Deletions
ShelfDb.prototype.remove = function () {
  return this.adapter.remove.apply(this.adapter, arguments);
};


// ------------------------------------------------------- Clear database
ShelfDb.prototype.empty = function () {
  return this.adapter.empty.apply(this.adapter, arguments);
};


// ------------------------------------------------------------ Event Handling
// ------------------------------------------------------- Subscription
ShelfDb.prototype.on = function () {
  return this.adapter.on.apply(this.adapter, arguments);
};

ShelfDb.prototype.off = function () {
  return this.adapter.off.apply(this.adapter, arguments);
};

module.exports = ShelfDb;