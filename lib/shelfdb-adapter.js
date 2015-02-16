/* jshint node:true */
'use strict';

var _ = require('lodash');

var ExceptionHandler = require('./exception-handler.js');
var config = require('../config/shelfdb.config.json');

function throwErrorIfUnexpected(error, adapter) {
  if (error.message.indexOf('Cannot find module \'' + adapter + '\'') === -1) {
    throw error;
  }
}

function tryAndLoadAdapter () {

  var adapterName, adapter;

  for (var index=0; index<config.preferredAdapters.length; ++index) {
    adapterName = config.preferredAdapters[index];

    try {
      return require(adapterName);

    } catch (error) {
      throwErrorIfUnexpected(error, adapterName);
    }
  }
}

var Adapter = tryAndLoadAdapter();

if (!Adapter) {
  ExceptionHandler.create('ShelfInitializationException',
    [
      'Failed to load any shelfdb-adapters.',
      'Install at least one using npm install %adapter% --save.',
      'Currently available adapters are:',
      config.preferredAdapters.join(', ')
    ].join(' '));
}

module.exports = Adapter;