/* jshint node:true */
'use strict';

var isNode = require('detect-node');

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
      throw error;
    }
    else {
      console.info('-- DB root directory exists at: ' + path + ' ... done');
    }

    return path;
  },

  initializeStore: function (collectionName, options) {

    var status;

    if (isNode) {
      console.info('\n- Initializing pouch store ...');

      if (!options || !options.db) {

        for (var i=0; i<this.stores.length; ++i) {
          var store = this.stores[i];

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
      }
    }

    return collectionName;
  }
};