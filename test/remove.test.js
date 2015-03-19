/* jshint node:true */
/* global describe, afterEach, beforeEach, it, catchIt */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';

var PouchDb = require('pouchdb');
var PouchDbStore = require('../index');

var expect = require('chai').expect;
var _ = require('lodash');
var q = require('q');

PouchDb.plugin(PouchDbStore);

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

var Store, pouch, sampleData;

describe('Testing PouchDbStore deletions', function(){

  beforeEach(function populateDb () {

    pouch = new PouchDb('tests', { db: require('memdown') });
    Store = pouch.store();

    return clearAllDocs(pouch)
      .then(function () {
        return Store.store(_.cloneDeep(samples))
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

    catchIt('will delete the item provided',
      function () {

        var testItem = sampleData['test-1'];

        return Store.remove(testItem)
          .then(function () {
            return Store.find(testItem.id)
              .catch(function (error) {
                expect(error.name).to.equal('ShelfDocumentNotFoundConflict');
                expect(error.info._original.reason).to.equal('deleted');

                throw error;
              });
          });
      });

    it('will only delete the item provided and no other',
      function () {

        var testItem = sampleData['test-1'];

        return Store.remove(testItem)
          .then(function () {
            return Store.all()
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

    catchIt('throws an ShelfDocumentUpdateConflict if the item is tried to be deleted twice',
      function () {

        var item;

        return Store.store(sampleData['test-1'])
          .then(function (storedItem) {
            item = storedItem;
            return Store.remove(storedItem);
          })
          .then(function () {
            return Store.remove(item)
              .catch(function (error) {
                expect(error.name).to.equal('ShelfDocumentUpdateConflict');
                expect(error.info._original.message).to.equal('Document update conflict');

                throw error;
              });
          });
      });
  });

  describe('using remove([:items])', function () {


    catchIt('will delete the items provided',
      function () {

        var testItems = [sampleData['test-1'], sampleData['test-2']];

        return Store.remove(testItems)
          .then(function () {
            return Store.find(testItems[0].id)
              .catch(function (error) {
                expect(error.type).to.equal('not-found');
                expect(error._original.reason).to.equal('deleted');

                Store.find(testItems[1].id)
                  .catch(function (error) {
                    expect(error.name).to.equal('ShelfDocumentNotFoundConflict');
                    expect(error.info._original.reason).to.equal('deleted');

                    throw error;
                  });
              });
          });
      });

    it('will only delete the items provided and no other',
      function () {

        var testItems = [sampleData['test-1'], sampleData['test-2']];

        return Store.remove(testItems)
          .then(function () {
            return Store.all()
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

    catchIt('throws an ShelfDocumentUpdateConflict if the items are tried to be deleted twice',
      function () {

        var items;

        return Store.store([sampleData['test-1'], sampleData['test-2']])
          .then(function (storedItems) {
            items = _.cloneDeep(storedItems);
            return Store.remove(storedItems);
          })
          .then(function () {
            return Store.remove(items)
              .catch(function (error) {
                expect(error.name).to.equal('ShelfDocumentUpdateConflict');
                expect(error.info._original.message).to.equal('Document update conflict');

                throw error;
              });
          });
      });
  });

  describe('using remove(:query)', function () {


    catchIt('will delete a single item solely identified by a query',
      function () {

        var testItem = sampleData['test-1'];

        return Store.remove({ value: testItem.value })
          .then(function () {
            var promises = [];

            return Store.find(testItem.id)
              .catch(function (error) {
                expect(error.name).to.equal('ShelfDocumentNotFoundConflict');
                expect(error.info._original.reason).to.equal('deleted');
                throw error;
              });
          });
      });


    it('will delete multiple items identified by a query',
      function () {

        return Store.remove({ 'shared': 'shared' })
          .then(function () {
            var promises = [];

            return Store.all()
              .then(function (items) {
                expect(items.length).to.equal(1);
              });
          });
      });

    it('will only delete the items provided and no other',
      function () {

        var testItem = sampleData['test-1'];

        return Store.remove({ value: testItem.value })
          .then(function () {
            return Store.find()
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

        return Store.remove({ value: 'invalid' })
          .then(function (deletedItems) {
            expect(deletedItems.length).to.equal(0);
          });
      });
  });
});
