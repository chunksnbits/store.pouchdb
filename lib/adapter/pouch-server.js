/* jshint node:true */
'use strict';

var _ = require('lodash');
var isNode = require('detect-node');
var PouchDb = require('pouchdb');

function PouchServer () {}

PouchServer.listen = function (app, serverOptions) {
  serverOptions = _.merge({
    root: '/'
  }, serverOptions);
  app.use(serverOptions.root, PouchServer._express(serverOptions));
};


PouchServer._express = function (serverOptions) {
  if (isNode) {
    PouchServer.__express = PouchServer.__express || require('express-pouchdb')(PouchDb, serverOptions);
    return PouchServer.__express;
  }
  return null;
};

module.exports = PouchServer;
