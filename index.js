/* jshint node:true */
'use strict';

var PouchDbStore = require('./lib/pouchdb-store.js');

var PouchDb;

var stores = {};

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

    if (!PouchDb) {
      PouchDb = require('pouchdb');
      PouchDb.plugin(PouchDbStore);
    }

    if (!stores[dbName]) {
      var pouch = new PouchDb(dbName, options);
      stores[dbName] = PouchDbStore.load(pouch, options);
    }

    return stores[dbName];
  }
};
