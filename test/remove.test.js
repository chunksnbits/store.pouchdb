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

var samples = _.cloneDeep(require('./fixtures/sample-data.json').values);

require('mocha-qa').global();

function clearAllDocs (pouch) {
  return pouch.allDocs({ include_docs: true })
    .then(function (response) {
      return q.all(_.map(response.rows, function (row) {
        return pouch.remove(row.id, row.value.rev);
      }));
    });
}

var testCollection, pouch, sampleData;

describe('Via the collections library', function(){

  beforeEach(function populateDb (done) {

    testCollection = Collection.load('tests', { debug: true });
    pouch = testCollection.adapter.pouch;

    return clearAllDocs(pouch)
      .then(function () {
        return testCollection.store(_.cloneDeep(samples))
          .then(function (items) {
            sampleData = {};

            _.each(items, function (item) {
              sampleData[item.value] = item;
            });
          });
      });
  });

  afterEach(function () {
    return clearAllDocs(pouch);
  });

  describe('using remove(:item)', function () {

    it('will delete the item provided',
      function () {

        var testItem = sampleData['test-1'];

        return testCollection.remove(testItem)
          .then(function () {
            return testCollection.find(testItem.id)
              .catch(function (error) {
                expect(error.type).to.equal('not-found');
                expect(error._original.reason).to.equal('deleted');
              });
          });
      });

    it('will only delete the item provided and no other',
      function () {

        var testItem = sampleData['test-1'];

        console.log('testItem', testItem);

        return testCollection.remove(testItem)
          .then(function () {
            return testCollection.find()
              .then(function (items) {
                console.log(items);
                var mapped = {};
                _.each(items, function (item) {
                  mapped[item.id] = item;
                });

                expect(items.length).to.equal(4);
                expect(mapped[testItem.id]).to.be.undefined;
              });
          });
      });

    // it('throws an ShelfDocumentNotFoundConflict when the item is not found in the collection',
    //   function (done) {

    //     var testItem = sampleData['test-1'];

    //     return testCollection.remove(testItem)
    //       .then(function () {
    //         return testCollection.remove(testItem)
    //           .then(function () {
    //             done(new Error('Test should have thrown a ShelfDocumentNotFoundConflict'));
    //           })
    //           .catch(function (error) {
    //             expect(error.name).to.equal('ShelfDocumentNotFoundConflict');
    //             done();
    //           });
    //       });
    //   });
  });

  describe('using remove([:items])', function () {


    it('will delete the items provided',
      function () {

        var testItems = [sampleData['test-1'], sampleData['test-2']];

        return testCollection.remove(testItems)
          .then(function () {
            return testCollection.find(testItems[0].id)
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
            return testCollection.find()
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

    // it('throws an \'not-found\' exception when the item is not found in the collection',
    //   function () {

    //     var testItems = [sampleData['test-1'], sampleData['test-2']];

    //     return testCollection.remove(testItems)
    //       .then(function () {
    //         return testCollection.remove(testItems)
    //           .catch(function (error) {
    //             expect(error.type).to.equal('not-found');
    //           });
    //       });
    //   });
  });

  describe('using remove(:query)', function () {


    it('will delete a single item solely identified by a query',
      function () {

        var testItem = sampleData['test-1'];

        return testCollection.remove({ value: testItem.value })
          .then(function () {
            var promises = [];

            return testCollection.find(testItem.id)
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

            return testCollection.find()
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
            return testCollection.find()
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