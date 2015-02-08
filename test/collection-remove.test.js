/* jshint node:true */
/* global describe, afterEach, beforeEach, it */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';

var expect = require('chai').expect;
var Collection = require('../lib/shelfdb');
var PouchDB = require('pouchdb');
var _ = require('lodash');
var q = require('q');

require('mocha-qa').global();

var testCollection, pouch, sampleData;

describe('Via the collections library', function(){

  beforeEach(function populateDb (done) {

    testCollection = Collection.load('tests', { debug: true });
    pouch = testCollection._pouch;

    return testCollection.store(require('./fixtures/sample-data.json').values)
      .then(function (items) {
        sampleData = {};

        _.each(items, function (item) {
          sampleData[item.value] = item;
        });
      });
  });

  afterEach(function clearDb (done) {
    return testCollection.empty();
  });

  describe('using remove(:item)', function () {

    it('will delete the item provided',
      function () {

        var testItem = sampleData['test-1'];

        return testCollection.remove(testItem)
          .then(function () {
            testCollection.find(testItem.id)
              .catch(function (error) {
                expect(error.type).to.equal('not-found');
                expect(error._original.reason).to.equal('deleted');
              });
          });
      });

    it('will only delete the item provided and no other',
      function () {

        var testItem = sampleData['test-1'];

        return testCollection.remove(testItem)
          .then(function () {
            testCollection.find()
              .then(function (items) {
                var mapped = {};
                _.each(items, function (item) {
                  mapped[item.id] = item;
                });

                expect(items.length).to.equal(4);
                expect(mapped[testItem.id]).to.be.undefined;
              });
          });
      });

    it('throws an \'not-found\' exception when the item is not found in the collection',
      function () {

        var testItem = sampleData['test-1'];

        return testCollection.remove(testItem)
          .then(function () {
            testCollection.remove(testItem)
              .catch(function (error) {
                expect(error.type).to.equal('not-found');
              });
          });
      });
  });

  describe('using remove([:items])', function () {


    it('will delete the items provided',
      function () {

        var testItems = [sampleData['test-1'], sampleData['test-2']];

        return testCollection.remove(testItems)
          .then(function () {
            testCollection.find(testItems[0].id)
              .catch(function (error) {
                expect(error.type).to.equal('not-found');
                expect(error._original.reason).to.equal('deleted');

                testCollection.find(testItems[1].id)
                  .catch(function (error) {
                    expect(error.type).to.equal('not-found');
                    expect(error._original.reason).to.equal('deleted');
                  });
              });
          });
      });

    it('will only delete the items provided and no other',
      function () {

        var testItems = [sampleData['test-1'], sampleData['test-2']];

        return testCollection.remove(testItems)
          .then(function () {
            testCollection.find()
              .then(function (items) {
                var mapped = {};
                _.each(items, function (item) {
                  mapped[item.id] = item;
                });

                expect(items.length).to.equal(3);
                expect(mapped[testItems[0].id]).to.be.undefined;
                expect(mapped[testItems[1].id]).to.be.undefined;
              });
          });
      });

    it('throws an \'not-found\' exception when the item is not found in the collection',
      function () {

        var testItems = [sampleData['test-1'], sampleData['test-2']];

        return testCollection.remove(testItems)
          .then(function () {
            testCollection.remove(testItems)
              .catch(function (error) {
                expect(error.type).to.equal('not-found');
              });
          });
      });
  });

  describe('using remove(:query)', function () {


    it('will delete a single item solely identified by a query',
      function () {

        var testItem = sampleData['test-1'];

        testCollection.remove({ value: testItem.value })
          .then(function () {
            var promises = [];

            testCollection.find(testItem.id)
              .catch(function (error) {
                expect(error.type).to.equal('not-found');
                expect(error._original.reason).to.equal('deleted');
              });
          });
      });


    it('will delete multiple items identified by a query',
      function () {

        return testCollection.remove({ 'shared': 'shared' })
          .then(function () {
            var promises = [];

            testCollection.find()
              .then(function (items) {
                expect(items.length).to.equal(1);
              });
          });
      });

    it('will only delete the items provided and no other',
      function () {

        var testItem = sampleData['test-1'];

        return testCollection.remove({ value: testItem.value })
          .then(function () {
            testCollection.find()
              .then(function (items) {

                var mapped = {};
                _.each(items, function (item) {
                  mapped[item.id] = item;
                });

                expect(items.length).to.equal(4);
                expect(mapped[testItem.id]).to.be.undefined;
              });
          });
      });

    it('delete no item when the query does not produce a match',
      function () {

        var testItem = sampleData['test-1'];

        return testCollection.remove({ value: 'invalid' })
          .then(function (deletedItems) {
            expect(deletedItems.length).to.equal(0);
          });
      });
  });
});