/* jshint node:true */
'use strict';

var _ = require('lodash');
var isNode = require('detect-node');
var CollectionError = require('../../utils/error-handler.js');

module.exports = {

  stores: ['memdown', 'mongodown', 'redisdown', 'riakdown', 'sqldown', 'mysqldown'],

  initializeFileStore: function () {
    var index = __dirname.indexOf('.node_modules');

    console.info('\n- Initializing pouch filestore ...');

    var path = index > -1 ? __dirname.substring(0, index) : '.';
    path = path + '/.db/';

    var fs = require('fs');

    // Create path in case it does not exist
    var exists = fs.existsSync(path);
    if (!exists) {
      var error = fs.mkdirSync(path);

      if (!error) {
        console.info('-- DB root directory successfully created at: ' + path);
        return path;
      }
      throw CollectionError.create({
        type: 'ShelfInitializationException',
        message: error.message,
        error: error
      });
    }
    else {
      console.info('-- DB root directory exists at: ' + path + ' ... done');
    }

    return path;
  },

  tryAndLoadStore: function (stores) {
    for (var i=0; i<stores.length; ++i) {
      var store = stores[i];

      try {
        var db = require(store);
        console.info('-- Attempting to intialize ' + store + ' db ... success.');
        return {
          db: db
        };
      } catch (e) {
        console.info('-- Attempting to intialize ' + store + ' db ... failed.');
      }
    }

    console.info('-- All db adapters failed. Falling back to filestore.');

    return {
      prefix: this.initializeFileStore()
    };
  },

  initializeStore: function (collectionName, options) {

    var status;

    if (isNode) {

      if (options.db) {
        var db = options.db;
        try {
          console.info('\n- Try and load store: ', db, ' ...');
          if (_.isString(db)) {
            db = require(db);
          }
        }
        catch (error) {
          throw CollectionError.create({
            type: 'ShelfInitializationException',
            message: 'Failed initializing store: ' + db + '. Have you installed the module (npm install --save ' + db + ')',
            error: error
          });
        }

        return {
          db: db
        };
      }
      else {
        console.info('\n- Initializing default pouch store ...');
        return this.tryAndLoadStore(this.stores);
      }
    }

    return collectionName;
  }
};