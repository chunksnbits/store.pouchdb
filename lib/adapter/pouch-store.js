/* jshint node:true */
'use strict';

var _ = require('lodash');

var PouchDb = require('pouchdb');

var isNode = require('detect-node');
var config = require('../../config/store.config.json');

// ----------------------------------------------------------------- Initialization
// ------------------------------------------------------------ Instance
// ------------------------------------------------------- Constructor
function PouchStore () {}

PouchStore.createDefaultStore = function (options) {

  function tryAndLoadAdapters (preferredAdapters) {
    for (var index=0; index<preferredAdapters.length; ++index) {
      var adapterName = preferredAdapters[index];
      try {
        var adapter = require(adapterName);
        console.info('PouchStore adapter: ' + adapterName + ' loaded.');
        return adapter;
      } catch (e) {
        console.info('PouchStore attempting to load adapter: ' + adapterName + ' failed.');
      }
    }

    return null;
  }

  PouchStore.defaults = options;

  if (isNode) {
    var adapter = tryAndLoadAdapters(config.preferredAdapters);

    if (adapter) {
      PouchStore.defaults = _.extend({
        db: adapter,
      }, PouchStore.defaults);
    }
    else {
      console.info('');
      console.info('PouchStore could not find any additional adapters. Falling back to leveldown.');

      var mkdirp = require('mkdirp');

      mkdirp.sync(config.dbLocation);

      PouchStore.defaults = _.extend({
        prefix: config.dbLocation,
      }, PouchStore.defaults);
    }
  }

  PouchStore.PouchDb = PouchDb.defaults(PouchStore.defaults);

  return PouchStore.PouchDb;
};

// ------------------------------------------------------------ Static
// ------------------------------------------------------- Initialization


// ----------------------------------------------------------------- Interface
// ------------------------------------------------------------ Instance
// ------------------------------------------------------- Initialization
PouchStore.load = function (storeName, options) {

  // The db for this PouchStore has already been
  // defined. Just use the adapter provided then.
  if (options.db) {
    return new PouchStore.PouchDb(storeName, {
      db: _.isString(options.db) ? require(options.db) : options.db
    });
  }

  options = _.merge(PouchStore.defaults, options);

  if (isNode) {
    return PouchStore._loadServerAdapter(storeName, options);
  }
  else {
    return PouchStore._loadClientAdapter(storeName, options);
  }
};


// ----------------------------------------------------------------- Prive methods
// ------------------------------------------------------------ Adapter Setup
// ------------------------------------------------------- Load adapter
PouchStore._loadServerAdapter = function (storeName, options) {
  return new PouchStore.PouchDb(storeName, options);
};

// ------------------------------------------------------------ Client
// ------------------------------------------------------- Setup
PouchStore._loadClientAdapter = function (storeName, options) {
  var localStore = new PouchStore.PouchDb(storeName);

  options = _.merge({}, config, options);

  if (options.sync !== false) {

    var remote = parseLocation(options.server) + '/' + storeName;

    PouchStore.PouchDb.sync(storeName, remote, {
      live: true
    });
  }

  return localStore;
};

function parseLocation (serverConfig) {
  return serverConfig.protocol + '://' + serverConfig.host + ':' + serverConfig.port + serverConfig.root;
}

module.exports = PouchStore;
