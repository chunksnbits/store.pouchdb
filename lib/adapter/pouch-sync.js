/* jshint node:true */
'use strict';

var _ = require('lodash');
var PouchDb = require('pouchdb');

function PouchSync () {}

PouchSync.sync = function (store, syncStore, options) {

  _.merge({
    live: true,
    retry: true
  }, options);

  if (!syncStore) {
    return;
  }

  return PouchDb.sync(store._name, syncStore._name ? syncStore._name : syncStore, options);
};


module.exports = PouchSync;
