/* jshint node:true */
'use strict';

var isNode = require('detect-node');

module.exports = {

  stores: ['memdown', 'mongodown', 'redisdown', 'riakdown', 'sqldown', 'mysqldown'],

  initializeFileStore: function () {
    var index = __dirname.indexOf('.node_modules');

    var path = index > -1 ? __dirname.substring(0, index) : '.';
    path = path + '/.db/';

    var fs = require('fs');

    // Create path in case it does not exist
    fs.exists(path, function(exists) {
      if (!exists) {
        fs.mkdir(path, function (error, success) {
          if (!error) {
            return console.info('DB root directory successfully created at: ' + path);
          }
          throw error;
        });
      }
      else {
        console.info('DB root directory exists at: ' + path);
      }
    });

    return path;
  },

  initializeStore: function (collectionName, options) {

    if (isNode) {
      if (!options || !options.db) {

        for (var i=0; i<this.stores.length; ++i) {
          var store = this.stores[i];

          console.info('Attempting to intialize ' + store + ' db ... ');
          try {
            var db = require(store);
            console.info(' ... success.');
            return {
              db: db
            };
          } catch (e) {
            console.info(' ... failed.');
          }
        }

        console.info('All db adapters failed. Falling back to filesystem store.');

        return {
          prefix: this.initializeFileStore()
        };
      }
    }

    return collectionName;
  }
};