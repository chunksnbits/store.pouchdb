/* jshint node:true */
/* global describe, after, afterEach, before, it, catchIt */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';


var expect = require('chai').expect;
var PouchDb = require('pouchdb');
var shelf = require('../index');
var _ = require('lodash');
var q = require('q');

require('mocha-qa').global();

var collection, sampleData = {};

PouchDb.plugin(shelf);

describe('Testing shelfdb events', function(){

  before(function initialize () {

    collection = new PouchDb('tests', {
      db: require('memdown')
    }).collection();
  });

  before(function emptyDb () {
    return collection.empty();
  });

  before(function populateDb () {
    return collection.store(_.cloneDeep(require('./fixtures/sample-data.json').values))
      .then(function (items) {
        return _.map(items, function (item, index) {
          sampleData[item.value] = item;
        });
      });
  });

  after(function clean () {
    return collection.empty();
  });

  afterEach(function unregisterEventEmitters () {
    collection.off();
  });

  describe('using on(event, fnc)', function () {

    it('fires a \'create\' event when storing a new item',
      function (done) {

        collection.on('create', function () {
          done();
        });

        collection.store({
          value: 'test'
        });
      });

    it('fires a \'change\' event when storing a new item',
      function (done) {

        collection.on('change', function () {
          done();
        });

        collection.store({
          value: 'test'
        });
      });

    it('fires an \'update\' event when updating an existing item',
      function (done) {

        collection.on('update', function () {
          done();
        });

        collection.store({
          value: 'test'
        })
          .then(function (item) {
            collection.store(_.merge(item, {
              value: 'changed'
            }));
          });
      });

    it('fires a \'change\' event when updating an existing item',
      function (done) {

        var listen = false;

        collection.on('change', function () {
          if (listen) {
            done();
          }
        });

        collection.store({
          value: 'test'
        })
          .then(function (item) {
            listen = true;
            collection.store(_.merge(item, {
              value: 'changed'
            }));
          });
      });

    it('fires a \'change\' event when updating an existing item',
      function (done) {

        collection.store({
          value: 'test'
        })
          .then(function (item) {
            collection.on('change', function () {
              done();
            });

            collection.store(_.merge(item, {
              value: 'changed'
            }));
          });
      });

    it('fires a \'delete\' event when removing an existing item',
      function (done) {

        collection.on('delete', function () {
          done();
        });

        collection.store({
          value: 'test'
        })
          .then(function (item) {
            collection.remove(item);
          });
      });

    it('fires a \'change\' event when removing an existing item',
      function (done) {

        collection.store({
          value: 'test'
        })
          .then(function (item) {
            collection.on('change', function () {
              done();
            });

            collection.remove(item);
          });
      });
  });

  describe('using off(event, fnc)', function () {
    it('allows to deregister a specific event listener by providing the event and callback function',
      function (done) {

        var callbackCalled = 0;
        var controlGroupCalled = 0;

        // Event to be deregistered after firing once
        var callback = function () {
          callbackCalled++;

          collection.off('change', callback);
        };
        collection.on('change', callback);

        // Controll callback to validate deregistration
        var controlGroup = function () {
          if (controlGroupCalled >= 3) {
            expect(callbackCalled).to.equal(1);
            return done();
          }

          controlGroupCalled++;
          collection.store({
            value: Math.random()
          });
        };
        collection.on('change', controlGroup);

        // Start the chain
        collection.store({
          value: 'test'
        });
      });
  });


  describe('using off(event)', function () {
    it('allows to deregister all listeners to a specific event at once',
      function (done) {

        var callbackCalled = {
          first: 0,
          second: 0
        };

        var controlGroupCalled = 0;

        function deregister () {
          if (callbackCalled.first && callbackCalled.second) {
            collection.off('change');
          }
        }

        // Event to be deregistered after firing once
        collection.on('change', function () {
          callbackCalled.first++;
          deregister();
        });

        collection.on('change', function () {
          callbackCalled.second++;
          deregister();
        });

        // Controll callback to validate deregistration
        var controlGroup = function () {
          if (controlGroupCalled >= 3) {
            expect(callbackCalled.first).to.equal(1);
            expect(callbackCalled.second).to.equal(1);
            return done();
          }

          controlGroupCalled++;
          collection.store({
            value: Math.random()
          });
        };
        collection.on('create', controlGroup);

        // Start the chain
        collection.store({
          value: 'test'
        });
      });
  });


  describe('using listener.off()', function () {
    it('allows to deregister a specific event listener by using the listener returned on registration',
      function (done) {

        var callbackCalled = 0;
        var controlGroupCalled = 0;

        // Event to be deregistered after firing once
        var eventListener = collection.on('change', function () {
          callbackCalled++;

          eventListener.off();
        });

        // Controll callback to validate deregistration
        var controlGroup = function () {
          if (controlGroupCalled >= 3) {
            expect(callbackCalled).to.equal(1);
            return done();
          }

          controlGroupCalled++;
          collection.store({
            value: Math.random()
          });
        };
        collection.on('change', controlGroup);

        // Start the chain
        collection.store({
          value: 'test'
        });
      });
  });


});
