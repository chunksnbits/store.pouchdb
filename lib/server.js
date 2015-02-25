/* jshint node:true */
'use strict';

var isNode = require('detect-node');

var express;

if (isNode) {
  // Ignored by browserify
  var nodeOnlyDependency = 'express';
  express = require(nodeOnlyDependency)();
}
else {
  express = {
    use: function () {}
  };
}

function ShelfServer () {}

ShelfServer.status = 'stopped';

ShelfServer.listen = function () {
  console.log('LISTEN');
  if (ShelfServer.status === 'stopped') {
    ShelfServer.app.listen(ShelfServer.options.server.port);

    console.info('ShelfServer listening to: ' + ShelfServer.options.server.protocol + '://' + ShelfServer.options.server.host + ':' + ShelfServer.options.server.port);
    console.info('Replication available at: ' + ShelfServer.options.server.protocol + '://' + ShelfServer.options.server.host + ':' + ShelfServer.options.server.port + ShelfServer.options.server.root);

    ShelfServer.status = 'active';
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
  console.log('INIT');
  ShelfServer.options = options;
  ShelfServer.app = express;
  ShelfServer.app.use(ShelfServer.options.server.root, middleware);

  ShelfServer.started = 'true';

  return ShelfServer;
};


module.exports = ShelfServer;