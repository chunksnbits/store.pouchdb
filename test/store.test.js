/* jshint node:true */
/* global describe, beforeEach, before, after, it, catchIt */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';

var PouchDb = require('pouchdb');
var PouchDbStore = require('../index');

var expect = require('chai').expect;
var _ = require('lodash');
var q = require('q');

require('mocha-qa').global();

PouchDb.plugin(PouchDbStore);

var Store, pouch;

function clearAllDocs (pouch) {
  return pouch.allDocs()
    .then(function (response) {
      return q.all(_.map(response.rows, function (row) {
        return pouch.remove(row.id, row.value.rev);
      }));
    });
}

describe('Testing shelfdb storage', function(){

  before(function setUpTestServer () {
    pouch = new PouchDb('tests', { db: require('memdown') });
    Store = pouch.store();
  });

  beforeEach(function () {
    clearAllDocs(pouch);
  });

  describe('using store() with new items', function () {

    it('successfully creates a new item with a generated _id',
      function () {

        return Store.store({
          value: 'test'
        }).then(function (storedItem) {
          return pouch.get(storedItem.id, { include_docs: true })
            .then(function (queriedItem) {
              expect(queriedItem._id).to.equal(storedItem.id);
              expect(queriedItem._rev).to.equal(storedItem.rev);
              expect(queriedItem.value).to.equal(storedItem.value);
            });
        });
      });

    it('successfully returns the newly created item',
      function () {

        return Store.store({
          value: 'test'
        }).then(function (storedItem) {
          expect(storedItem.id).to.exist;
          expect(storedItem.rev).to.exist;
          expect(storedItem.value).to.equal('test');
        });
      });

    it('with a single item successfully stores exactly one item',
      function () {

        return Store.store({
          value: 'test'
        }).then(function (storedItem) {
          return pouch.allDocs()
            .then(function (response) {
              expect(response.rows.length).to.equal(1);
            });
        });
      });

    it('with an array of n items successfully stores exactly the same number of items',
      function () {

        return Store.store([{
          value: 'test-1'
        }, {
          value: 'test-2'
        }, {
          value: 'test-3'
        }]).then(function (storedItem) {
          return pouch.allDocs()
            .then(function (response) {
              expect(response.rows.length).to.equal(3);
            });
        });
      });


    it('with an array of items successfully stores all items in the array',
      function () {

        return Store.store([{
          value: 'test-1'
        }, {
          value: 'test-2'
        }, {
          value: 'test-3'
        }]).then(function (storedItem) {
          return pouch.allDocs({ include_docs: true })
            .then(function (response) {
              var values = _.map(response.rows, function (row) {
                return row.doc.value;
              });

              expect(values).to.include('test-1');
              expect(values).to.include('test-2');
              expect(values).to.include('test-3');
            });
        });
      });

    it('with an array of items will store the items correctly',
      function () {

        return Store.store([{
          value: 'test-1'
        }, {
          value: 'test-2'
        }, {
          value: 'test-3'
        }]).then(function () {
          return pouch.allDocs({ include_docs: true })
            .then(function (response) {
              var sorted = {};

              _.each(response.rows, function (row) {
                sorted[row.doc.value] = {
                  value: row.doc.value,
                  id: row.id,
                  rev: row.value.rev
                };
              });

              var sample = sorted['test-1'];

              expect(sample.value).to.equal('test-1');
              expect(sample.id).to.exist;
              expect(sample.rev).to.exist;
            });
          });
      });
  });

  describe('using store() with existing items', function () {

    it('will not create another new item',
      function () {

        return Store
          .store({
            value: 'test-1'
          })
          .then(function (item) {
            return Store.store(_.merge(item, {
              value: 'test-2'
            }));
          })
          .then(function (storedItem) {
            return pouch.allDocs()
              .then(function (response) {
                expect(response.rows.length).to.equal(1);
              });
            });
      });

    it('will succeed in overriding an existing item\'s attribute',
      function () {

        return Store
          .store({
            value: 'test-1'
          })
          .then(function (item) {
            return Store.store(_.merge(item, {
              value: 'test-2'
            }));
          })
          .then(function (storedItem) {
            return pouch.get(storedItem.id)
              .then(function (item) {
                expect(item.value).to.equal('test-2');
                expect(item._id).to.exist;
                expect(item._rev).to.exist;
              });
            });
      });

    it('will succeed in adding an attribute to an existing item',
      function () {

        return Store
          .store({
            value: 'test-1'
          })
          .then(function (item) {
            return Store.store(_.merge(item, {
              other: 'test-2'
            }));
          })
          .then(function (storedItem) {
            return pouch.get(storedItem.id)
              .then(function (item) {
                expect(item.value).to.equal('test-1');
                expect(item.other).to.equal('test-2');
                expect(item._id).to.exist;
                expect(item._rev).to.exist;
              });
            });
      });

    it('will not update an item by default if the item is unchanged',
      function () {

        var initial;

        return Store
          .store({
            value: 'test-1'
          })
          .then(function (item) {
            initial = _.cloneDeep(item);
            return Store.store(item);
          })
          .then(function (storedItem) {
            expect(storedItem.rev).to.equal(initial.rev);
          });
      });


    it('will not create an additional item when using bulk operation',
      function () {

        return Store
          .store([{ value: 'test-1' }, { value: 'test-2' }, { value: 'test-3' }])
          .then(function (storedItems) {
            return Store.store(_.map(storedItems, function (item) {
              item.value = 'test';
              return item;
            }));
          })
          .then(function (updatedItems) {
            pouch.allDocs()
              .then(function (response) {
                expect(response.rows.length).to.equal(3);
              });
          });
      });

    it('will succeed in udpating multiple items when provided in an array',
      function () {

        return Store
          .store([{ value: 'test-1' }, { value: 'test-2' }, { value: 'test-3' }])
          .then(function (storedItems) {
            return Store.store(_.map(storedItems, function (item) {
              item.value = 'test';
              return item;
            }));
          })
          .then(function (updatedItems) {
            pouch.allDocs({ include_docs: true })
              .then(function (response) {
                expect(response.rows[0].doc.value).to.equal('test');
                expect(response.rows[1].doc.value).to.equal('test');
                expect(response.rows[2].doc.value).to.equal('test');
              });
          });
      });

    catchIt('throws a ShelfDocumentUpdateConflict when trying to update an already updated item',
      function () {

        var revision;

        return Store
          .store({
            value: 'test-1'
          })
          .then(function (item) {
            revision = item.rev;
            return Store.store(_.merge(item, {
              value: 'test-2'
            }));
          })
          .then(function (item) {
            return Store.store(_.merge(item, {
              value: 'test-3',
              rev: revision
            }));
          })
          .catch(function (error) {
            expect(error.name).to.equal('ShelfDocumentUpdateConflict');
            throw error;
          });
      });
  });
});
