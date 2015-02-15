/* jshint node:true */
/* global describe, after, afterEach, before, it, catchIt */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';


var expect = require('chai').expect;
var ShelfDb = require('../lib/shelfdb');
var _ = require('lodash');
var q = require('q');

require('mocha-qa').global();
var testCollection, sampleData = {};

function clearAllDocs () {
  return testCollection.empty();
}

describe('Testing shelfdb events', function(){

  before(function initialize () {
    testCollection = ShelfDb.load('tests', { debug: true });
  });

  before(function emptyDb () {
    return clearAllDocs();
  });

  before(function populateDb () {
    var items = _.cloneDeep(require('./fixtures/sample-data.json').values);

    return testCollection.store(items)
      .then(function (identity) {
        return _.map(items, function (item, index) {
          sampleData[item.value] = _.extend(item, identity[index]);
        });
      });
  });

  after(function clean () {
    return clearAllDocs();
  });

  afterEach(function unregisterEventEmitters () {
    testCollection.off();
  });

  describe('using on(event, fnc)', function () {

    it('fires a \'create\' event when storing a new item',
      function (done) {

        testCollection.on('create', function () {
          done();
        });

        testCollection.store({
          value: 'test'
        });
      });

    it('fires a \'change\' event when storing a new item',
      function (done) {

        testCollection.on('change', function () {
          done();
        });

        testCollection.store({
          value: 'test'
        });
      });

    it('fires an \'update\' event when updating an existing item',
      function (done) {

        testCollection.on('update', function () {
          done();
        });

        testCollection.store({
          value: 'test'
        })
          .then(function (item) {
            testCollection.store(_.merge(item, {
              value: 'changed'
            }));
          });
      });

    it('fires a \'change\' event when updating an existing item',
      function (done) {

        var listen = false;

        testCollection.on('change', function () {
          if (listen) {
            done();
          }
        });

        testCollection.store({
          value: 'test'
        })
          .then(function (item) {
            listen = true;
            testCollection.store(_.merge(item, {
              value: 'changed'
            }));
          });
      });

    it('fires a \'change\' event when updating an existing item',
      function (done) {

        testCollection.store({
          value: 'test'
        })
          .then(function (item) {
            testCollection.on('change', function () {
              done();
            });

            testCollection.store(_.merge(item, {
              value: 'changed'
            }));
          });
      });

    it('fires a \'delete\' event when removing an existing item',
      function (done) {

        testCollection.on('delete', function () {
          done();
        });

        testCollection.store({
          value: 'test'
        })
          .then(function (item) {
            testCollection.remove(item);
          });
      });

    it('fires a \'change\' event when removing an existing item',
      function (done) {

        testCollection.store({
          value: 'test'
        })
          .then(function (item) {
            testCollection.on('change', function () {
              done();
            });

            testCollection.remove(item);
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

          testCollection.off('change', callback);
        };
        testCollection.on('change', callback);

        // Controll callback to validate deregistration
        var controlGroup = function () {
          if (controlGroupCalled >= 3) {
            expect(callbackCalled).to.equal(1);
            return done();
          }

          controlGroupCalled++;
          testCollection.store({
            value: Math.random()
          });
        };
        testCollection.on('change', controlGroup);

        // Start the chain
        testCollection.store({
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
            testCollection.off('change');
          }
        }

        // Event to be deregistered after firing once
        testCollection.on('change', function () {
          callbackCalled.first++;
          deregister();
        });

        testCollection.on('change', function () {
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
          testCollection.store({
            value: Math.random()
          });
        };
        testCollection.on('create', controlGroup);

        // Start the chain
        testCollection.store({
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
        var eventListener = testCollection.on('change', function () {
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
          testCollection.store({
            value: Math.random()
          });
        };
        testCollection.on('change', controlGroup);

        // Start the chain
        testCollection.store({
          value: 'test'
        });
      });
  });


});