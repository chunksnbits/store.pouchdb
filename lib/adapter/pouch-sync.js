/* jshint node:true */
'use strict';

var _ = require('lodash');
var PouchDb = require('pouchdb');

function PouchSync () {}

PouchSync.sync = function (store, syncStore, options) {

  if (!syncStore) {
    return;
  }

  _.merge({
    live: true,
    retry: true
  }, options);

  if (!_.isString(syncStore) && syncStore.toString() === '[object Store]') {
    syncStore = syncStore._adapter.pouch;
  }

  return PouchDb.sync(store._adapter.pouch, syncStore, options);
};


module.exports = PouchSync;
