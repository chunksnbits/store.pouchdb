/* jshint node:true */
'use strict';

var ShelfDb = require('./lib/shelfdb.js');

module.exports = {
  collection: function (options) {
    return ShelfDb.load(this, options);
  }
};
