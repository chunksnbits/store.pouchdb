/* jshint node:true */
/* global describe, after, afterEach, before, it, catchIt */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';

var expect = require('chai').expect;
var Collection = require('../lib/shelfdb');
var PouchDB = require('pouchdb');
var _ = require('lodash');
var q = require('q');

require('mocha-qa').global();
var testCollection, pouch, sampleData = {};

function clearAllDocs (pouch) {
  return pouch.allDocs()
    .then(function (response) {
      return q.all(_.map(response.rows, function (row) {
        return pouch.remove(row.id, row.value.rev);
      }));
    });
}

describe('Via the collections library', function(){

  before(function initialize () {
    testCollection = Collection.load('tests', { debug: true });
    pouch = testCollection.adapter.pouch;
  });

  before(function emptyDb () {
    return clearAllDocs(pouch);
  });

  afterEach(function deregisterEventListeners () {
    var events = ['change', 'create', 'update', 'delete'];

    _.each(events, function (event) {
      testCollection.off(event);
    });
  });

  after(function emptyDb () {
    return clearAllDocs(pouch);
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

        var changeCalled = 0;
        var item;

        var callback = function () {
          changeCalled = changeCalled + 1;

          testCollection.off('change', callback);

          testCollection.store(_.merge(item, {
            value: 'changed'
          }));
        };

        testCollection.on('change', callback);

        testCollection.store({
          value: 'test'
        })
          .then(function (result) {
            item = result;

            testCollection.on('update', function () {
              setTimeout(function () {
                expect(changeCalled).to.equal(1);
                done();
              }, 0);
            });
          });
      });
  });


  describe('using off(event)', function () {
    it('allows to deregister all listeners to a specific event at once',
      function (done) {

        var changeCalled = 0;
        var item;

        var callback = function () {
          changeCalled = changeCalled + 1;
        };

        var callbackTwo = function () {
          changeCalled = changeCalled + 1;

          testCollection.off('change');
          testCollection.store(_.merge(item, {
            value: 'changed'
          }));
        };

        testCollection.on('change', callback);
        testCollection.on('change', callbackTwo);

        testCollection.store({
          value: 'test'
        })
          .then(function (result) {
            item = result;

            testCollection.on('update', function () {
              setTimeout(function () {
                expect(changeCalled).to.equal(2);
                done();
              }, 0);
            });
          });
      });
  });


  describe('using listener.off()', function () {
    it('allows to deregister a specific event listener by using the listener returned on registration',
      function (done) {

        var changeCalled = 0;
        var registration, item;

        var callback = function () {
          changeCalled = changeCalled + 1;

          if (registration) {
            registration.off();
          }

          testCollection.store(_.merge(item, {
            value: 'changed'
          }));
        };

        registration = testCollection.on('change', callback);

        testCollection.store({
          value: 'test'
        })
          .then(function (result) {
            item = result;

            testCollection.on('update', function () {
              setTimeout(function () {
                expect(changeCalled).to.equal(1);
                done();
              }, 0);
            });
          });
      });
  });


});