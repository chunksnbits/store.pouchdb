/* jshint node:true */
/* global describe, after, afterEach, before, it, catchIt */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';


var PouchDb = require('pouchdb');
var PouchDbStore = require('../index');

var expect = require('chai').expect;
var _ = require('lodash');
var q = require('bluebird');
var isNode = require('detect-node');

require('mocha-qa').global();

var Store, sampleData = {};

PouchDb.plugin(PouchDbStore);

describe('Testing shelfdb events', function(){

  before(function initialize () {

    Store = new PouchDb('tests',
      isNode ? { db: require('memdown') } : {}
    ).store();
  });

  before(function emptyDb () {
    return Store.remove();
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
    return Store.remove();
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

        _.delay(function () {
          Store.store({
            value: 'test'
          });
        }, 100);
      });

    it('fires a \'change\' event when storing a new item',
      function (done) {

        Store.on('change', function () {
          done();
        });

        _.delay(function () {
          Store.store({
            value: 'test'
          });
        }, 100);
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
            _.delay(function () {
              Store.remove(item);
            }, 100);
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
        _.delay(function () {
          Store.store({
            value: 'test'
          });
        }, 100);
      });
  });


});
