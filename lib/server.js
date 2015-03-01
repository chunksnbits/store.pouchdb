/* jshint node:true */
'use strict';

var _ = require('lodash');

function ShelfServer () {
  this.middlewares = [];
}

ShelfServer.prototype.init = function (middleware, options) {
  this.middlewares.push({
    middleware: middleware,
    options: options
  });

  return this;
};

ShelfServer.prototype.register = function (app) {
  _.each(ShelfServer.middlewares, function (config) {
    app.use(ShelfServer.options.server.root, config.middleware, config.options);
  });

  return this;
};


module.exports = new ShelfServer();