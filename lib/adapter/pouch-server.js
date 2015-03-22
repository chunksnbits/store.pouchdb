/* jshint node:true */
'use strict';

var _ = require('lodash');
var isNode = require('detect-node');

function PouchServer () {}

PouchServer.listen = function (store, app, serverOptions) {

  if (!app) {
    return;
  }

  serverOptions = _.merge({
    root: '/',
    configPath: './.db/config.json'
  }, serverOptions);

  app.use(serverOptions.root, PouchServer._express(store, serverOptions));
};


PouchServer._express = function (store, serverOptions) {
  if (isNode) {

    // Make sure temporary files created by pouch express are
    // stored into the right folder
    var configPath = serverOptions.configPath.replace(/\/[^\/]*$/, '/');

    var mkdirp = require('mkdirp');
    mkdirp.sync(configPath.replace());

    var PouchDb = require('pouchdb').defaults(store._adapter.pouch.__opts);

    PouchServer.__express = PouchServer.__express || require('express-pouchdb')(PouchDb, serverOptions);
    return PouchServer.__express;
  }
  return null;
};

module.exports = PouchServer;
