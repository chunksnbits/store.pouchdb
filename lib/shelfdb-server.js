
// ----------------------------------------------------------------- Dependencies
// ------------------------------------------------------------ Utils
var _ = require('lodash');
var url = require('url');
var isNode = require('detect-node');

// ------------------------------------------------------------ Express
var express = require('express');

// ----------------------------------------------------------------- Initialization
// ------------------------------------------------------------ Instance
// ------------------------------------------------------- Constructor
function ShelfServer () {}


// ----------------------------------------------------------------- Interface
// ------------------------------------------------------------ Instance
// ------------------------------------------------------- Initialization
ShelfServer.prototype.init = function (middleware, options) {
  this.options = options;

  this._parseLocation();

  if (isNode) {
    this.app = express();

    this.app.use(this.options.server.root, middleware);
    this.status = 'stopped';
  }
  else {
    this.status = 'active';
  }

  return this;
};

// ------------------------------------------------------- Listen
ShelfServer.prototype.listen = function () {
  this.app.listen(this.options.server.port);
  this.status = 'active';
};

ShelfServer.prototype.stop = function () {
  this.app.stop();
  this.status = 'stopped';
};

ShelfServer.prototype.active = function () {
  return isNode ? true : this.status === 'active';
};

ShelfServer.prototype.stopped = function () {
  return isNode ? this.status === 'stopped' : false;
};


// ----------------------------------------------------------------- Private methods
// ------------------------------------------------------------ Utils
// ------------------------------------------------------- URL parser
ShelfServer.prototype._parseLocation = function () {
  //
  // Server path can also be given via string.
  // In those cases parse url-string to config first.
  //
  if (_.isString(this.options.server)) {

    var location = url.parse(this.options.server);

    this.options.server = _.merge(this.options.server, {
      location: location,
      host: location.hostname,
      port: location.port,
      root: location.pathname
    });
  }
  else {
    this.options.server.location = url.format(this.options.server);
  }

  return this.options.server;
};

module.exports = new ShelfServer();