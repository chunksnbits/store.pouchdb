/* jshint node:true */
'use strict';

var PouchDbStore = require('./lib/store');
var StoreLoader = require('./lib/store-loader');

module.exports = {
  //
  // Plugin loader for PouchDbStore.
  //
  // Usage:
  //   var PouchDb = require('pouchdb');
  //   PouchDb.plugin(require('pouchdb-store'));
  //   var MyStore = new PouchDb('myStore').store();
  //   ...
  //
  store: function (options) {
    return PouchDbStore.load(this, options);
  },

  //
  // Standalone loader for PouchDbStore.
  //
  // Usage:
  //   var PouchDbStore = require('pouchdb-store');
  //   var MyStore = PouchDbStore.open('myStore');
  //   ...
  //
  open: function (dbName, options) {
    return StoreLoader.load(dbName, options);
  }
};
