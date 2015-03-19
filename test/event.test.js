/* jshint node:true */
/* global describe, after, afterEach, before, it, catchIt */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';


var PouchDb = require('pouchdb');
var PouchDbStore = require('../index');

var expect = require('chai').expect;
var _ = require('lodash');
var q = require('q');

require('mocha-qa').global();

var Store, sampleData = {};

PouchDb.plugin(PouchDbStore);

describe('Testing shelfdb events', function(){

  before(function initialize () {

    Store = new PouchDb('tests', {
      db: require('memdown')
    }).store();
  });

  before(function emptyDb () {
    return Store.empty();
  });

  before(function populateDb () {
    return Store.store(_.cloneDeep(require('./fixtures/sample-data.json').values))
      .then(function (items) {
        return _.map(items, function (item, index) {
          sampleData[item.value] = item;
        });
      });
  });

  after(function clean () {
    return Store.empty();
  });

  afterEach(function unregisterEventEmitters () {
    Store.off();
  });

  describe('using on(event, fnc)', function () {

    it('fires a \'create\' event when storing a new item',
      function (done) {

        Store.on('create', function () {
          done();
        });

        Store.store({
          value: 'test'
        });
      });

    it('fires a \'change\' event when storing a new item',
      function (done) {

        Store.on('change', function () {
          done();
        });

        Store.store({
          value: 'test'
        });
      });

    it('fires an \'update\' event when updating an existing item',
      function (done) {

        Store.on('update', function () {
          done();
        });

        Store.store({
          value: 'test'
        })
          .then(function (item) {
            Store.store(_.merge(item, {
              value: 'changed'
            }));
          });
      });

    it('fires a \'change\' event when updating an existing item',
      function (done) {

        var listen = false;

        Store.on('change', function () {
          if (listen) {
            done();
          }
        });

        Store.store({
          value: 'test'
        })
          .then(function (item) {
            listen = true;
            Store.store(_.merge(item, {
              value: 'changed'
            }));
          });
      });

    it('fires a \'change\' event when updating an existing item',
      function (done) {

        Store.store({
          value: 'test'
        })
          .then(function (item) {
            Store.on('change', function () {
              done();
            });

            Store.store(_.merge(item, {
              value: 'changed'
            }));
          });
      });

    it('fires a \'delete\' event when removing an existing item',
      function (done) {

        Store.on('delete', function () {
          done();
        });

        Store.store({
          value: 'test'
        })
          .then(function (item) {
            Store.remove(item);
          });
      });

    it('fires a \'change\' event when removing an existing item',
      function (done) {

        Store.store({
          value: 'test'
        })
          .then(function (item) {
            Store.on('change', function () {
              done();
            });

            Store.remove(item);
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

          Store.off('change', callback);
        };
        Store.on('change', callback);

        // Controll callback to validate deregistration
        var controlGroup = function () {
          if (controlGroupCalled >= 3) {
            expect(callbackCalled).to.equal(1);
            return done();
          }

          controlGroupCalled++;
          Store.store({
            value: Math.random()
          });
        };
        Store.on('change', controlGroup);

        // Start the chain
        Store.store({
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
            Store.off('change');
          }
        }

        // Event to be deregistered after firing once
        Store.on('change', function () {
          callbackCalled.first++;
          deregister();
        });

        Store.on('change', function () {
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
          Store.store({
            value: Math.random()
          });
        };
        Store.on('create', controlGroup);

        // Start the chain
        Store.store({
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
        var eventListener = Store.on('change', function () {
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
          Store.store({
            value: Math.random()
          });
        };
        Store.on('change', controlGroup);

        // Start the chain
        Store.store({
          value: 'test'
        });
      });
  });


});
