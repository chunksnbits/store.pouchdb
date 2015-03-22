/* jshint node:true */

'use strict';

var _ = require('lodash');
var isNode = require('detect-node');

var PouchDb = require('pouchdb');
var PouchDbStore = require('./pouchdb-store');

PouchDb.plugin(PouchDbStore);

function PouchDbStoreLoader () {}

PouchDbStoreLoader.prototype.load = function (dbName, options) {

  options = _.extend({}, options);

  var stores = {};

  if (!stores[dbName]) {
    var pouch = new PouchDb(dbName, options);
    var store = PouchDbStore.load(pouch, options);

    stores[dbName] = store;
  }

  return stores[dbName];
};

PouchDbStoreLoader.prototype._extract = function () {
  var options = _.first(arguments);

  var result = _.pick.apply(options, arguments);
  options = _.omit(options, arguments);

  return result;
};

module.exports = new PouchDbStoreLoader();
