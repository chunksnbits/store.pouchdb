/* jshint node:true */
/* global describe, after, before, it, catchIt */

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

  before(function populateDb (done) {

    testCollection = Collection.load('tests', { debug: true });
    pouch = testCollection._pouch;

    return testCollection.empty()
      .then(function () {
        return testCollection.store(require('./fixtures/sample-data.json').values);
      })
      .then(function (items) {
        sampleData = {};

        _.each(items, function (item) {
          sampleData[item.value] = item;
        });
      });
  });

  after(function clearDb (done) {
    return testCollection.empty();
  });

  describe('using find(:id)', function () {

    it('returns the right item when querying by id',
      function (done) {

        var testItem = sampleData['test-1'];

        return testCollection.find(testItem.id)
          .then(function (item) {
            expect(item.id).to.exist;
            expect(item.id).to.equal(testItem.id);
            expect(item.rev).to.exist;
            expect(item.value).to.equal('test-1');
            expect(item.nested.deep.value).to.equal('test-nested-deep-1');
          });
      });

    catchIt('throws an \'not-found\' exception when no item is found for the given id',
      function (done) {
        return testCollection.find('invalid');
      });
  });

  describe('using find(:query)', function () {
    it('returns the right item when querying by query',
      function (done) {

        var testItem = sampleData['test-1'];

        return testCollection.find({
          value: testItem.value
        })
          .then(function (items) {
            var item = _.first(items);

            expect(item.id).to.exist;
            expect(item.id).to.equal(testItem.id);
            expect(item.rev).to.exist;
            expect(item.value).to.equal('test-1');
            expect(item.nested.deep.value).to.equal('test-nested-deep-1');
          });
      });

    it('returns the right item when querying by nested query',
      function (done) {

        var testItem = sampleData['test-1'];

        return testCollection.find({
          nested: {
            deep: {
              value: testItem.nested.deep.value
            }
          }
        })
          .then(function (items) {
            var item = _.first(items);

            expect(item.id).to.exist;
            expect(item.id).to.equal(testItem.id);
            expect(item.rev).to.exist;
            expect(item.value).to.equal('test-1');
            expect(item.nested.deep.value).to.equal('test-nested-deep-1');
          });
      });

    it('returns all items that match the given query with nested queries',
      function (done) {

        return testCollection.find({
          shared: 'shared'
        })
          .then(function (items) {
            expect(items.length).to.equal(4);
          });
      });

    it('returns all items that match the given query',
      function (done) {

        return testCollection.find({
          nested: {
            shared: 'nested-shared'
          }
        })
          .then(function (items) {
            expect(items.length).to.equal(3);
          });
      });

    it('returns an empty array if no entity in the collection matches the query',
      function (done) {

        return testCollection.find({ value: 'invalid' })
          .then(function (items) {
            expect(items.length).to.equal(0);
          });
      });
  });


  describe('using find()', function () {

    it('returns all items in the collection',
      function (done) {
        return testCollection.find()
          .then(function (items) {
            expect(items.length).to.equal(5);
          });
      });

    it('returns the full dataset',
      function (done) {

        var testItem = sampleData['test-1'];

        return testCollection.find({
          nested: {
            deep: {
              value: testItem.nested.deep.value
            }
          }
        })
          .then(function (items) {
            var item = _.first(items);

            expect(item.id).to.exist;
            expect(item.id).to.equal(testItem.id);
            expect(item.rev).to.exist;
            expect(item.value).to.equal('test-1');
            expect(item.nested.deep.value).to.equal('test-nested-deep-1');
          });
      });

    it('returns an empty array if there is no entity in the collection',
      function (done) {

        return testCollection.empty()
          .then(function () {
            testCollection.find()
              .then(function (items) {
                expect(items.length).to.equal(0);
              });
          });
      });

  });
});