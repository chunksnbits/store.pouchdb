/* jshint node:true */
'use strict';

var _ = require('lodash');
var isNode = require('detect-node');

var express;

if (isNode) {
  // Ignored by browserify
  var nodeOnlyDependency = 'express';
  express = require(nodeOnlyDependency);
}
else {
  express = function () {};
}

function ShelfServer () {}

ShelfServer.status = 'stopped';
ShelfServer.middlewares = [];

ShelfServer.listen = function () {
  console.log('listen');
  if (ShelfServer.status === 'stopped') {
    if (!ShelfServer._started) {
      ShelfServer.start();
    }

    ShelfServer.app.listen(ShelfServer.options.server.port);
    ShelfServer.status = 'active';

    console.info('ShelfServer listening to: ' + ShelfServer.options.server.protocol + '://' + ShelfServer.options.server.host + ':' + ShelfServer.options.server.port);
    console.info('Replication available at: ' + ShelfServer.options.server.protocol + '://' + ShelfServer.options.server.host + ':' + ShelfServer.options.server.port + ShelfServer.options.server.root);
  }
};

ShelfServer.stop = function () {
  if (ShelfServer.status === 'active') {
    ShelfServer.app.stop();
    ShelfServer.status = 'stopped';
  }
};

ShelfServer.stopped = function () {
  return isNode ? ShelfServer.status === 'stopped' : false;
};

ShelfServer.init = function (middleware, options) {
  ShelfServer.options = options;
  ShelfServer.app = express();
  ShelfServer.middlewares.push(middleware);

  return ShelfServer;
};

ShelfServer.start = function () {
  _.each(ShelfServer.middlewares, function (middleware) {
    ShelfServer.app.use(ShelfServer.options.server.root, middleware);
  });

  ShelfServer._started = true;

  return ShelfServer;
};


module.exports = ShelfServer;