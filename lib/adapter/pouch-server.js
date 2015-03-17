/* jshint node:true */
'use strict';

var isNode = require('detect-node');
var config = require('../../config/store.config.json');

var createMiddleware;

if (isNode) {
  createMiddleware = function (PouchDb) {
    // Set up config location
    var mkdirp = require('mkdirp');
    mkdirp.sync(config.dbLocation);

    // Set up express-pouch
    var expressPouch = require('express-pouchdb')({
      configPath: config.dbLocation + 'pouch-config.json'
    });

    // return expressPouch(PouchDb);
  };
}
else {
  createMiddleware = function () {};
}

module.exports = {
  createMiddleware: createMiddleware
};
