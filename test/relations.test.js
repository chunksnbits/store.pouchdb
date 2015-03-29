/* jshint node:true */
/* global describe, afterEach, before, it */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';

var PouchDb = require('pouchdb');
var PouchDbStore = require('../index');

var expect = require('chai').expect;
var _ = require('lodash');
var q = require('bluebird');
var isNode = require('detect-node');

PouchDb.plugin(PouchDbStore);

require('mocha-qa').global();

var Store, VehicleStore, BoatStore, pouch;

function clearDb () {

  function empty (store) {
    var pouch = store._adapter.pouch;

    return pouch.allDocs()
      .then(function (response) {
        return q.all(_.map(response.rows, function (row) {
          return pouch.remove(row.id, row.value.rev);
        }));
      });
  }

  return q.all([
    empty(Store),
    empty(VehicleStore),
    empty(BoatStore)
  ]);
}

describe('Testing PouchDbStore relations', function() {

  before(function populateDb () {

    Store = new PouchDb('tests', isNode ? { db: require('memdown') } : {}).store();

    Store.hasMany('vehicles');
    Store.hasOne('boat', 'boats');

    VehicleStore = new PouchDb('vehicles', isNode ? { db: require('memdown') } : {}).store();
    BoatStore = new PouchDb('boats', isNode ? { db: require('memdown') } : {}).store();

    // Just to be sure
    return clearDb();
  });

  afterEach(clearDb);

  describe('using hasMany() and store(:new)', function () {

    it('stores a single related item, when saving the parent item',
      function () {

        var testItem = {
          value: 'test',
          vehicles: [{
            value: 'relation'
          }]
        };

        return Store.store(testItem)
          .then(function (item) {

            VehicleStore.find()
              .then(function (relations) {
                expect(relations.length).to.equal(1);
                expect(_.first(relations).id).to.exist;
                expect(_.first(relations).id).to.equal(_.first(item.vehicles).id);
              });
          });
      });

    it('stores a multiple related items, when saving the parent item',
      function () {

        var testItem = {
          value: 'test',
          vehicles: [{
            value: 'relation-1'
          }, {
            value: 'relation-2'
          }, {
            value: 'relation-3'
          }]
        };

        return Store.store(testItem)
          .then(function (item) {

            VehicleStore.find()
              .then(function (relations) {
                expect(relations.length).to.equal(3);
              });
          });
      });

    it('stores all related items, when saving multiple parent items at once',
      function () {

        var testItems = [{
          value: 'test-1',
          vehicles: [{
            value: 'relation-1'
          }, {
            value: 'relation-2'
          }]
        }, {
          value: 'test-2',
          vehicles: [{
            value: 'relation-3'
          }, {
            value: 'relation-4'
          }]
        }];

        return Store.store(testItems)
          .then(function (items) {

            VehicleStore.find()
              .then(function (relations) {
                expect(relations.length).to.equal(4);
              });
          });
      });

    it('does not update related items if they have not changed',
      function () {

        return VehicleStore.store({
          value: 'relation-1'
        }).then(function (relation) {
          // Clone in order to rule out side-effects
          relation = _.clone(relation);

          var testItem = {
            value: 'test-1',
            vehicles: [relation]
          };

          return Store.store(testItem)
            .then(function (item) {

              VehicleStore.find()
                .then(function (relations) {
                  expect(relations.length).to.equal(1);
                  expect(_.first(relations).id).to.equal(relation.id);
                  expect(_.first(relations).rev).to.equal(relation.rev);
                });
            });
        });

      });

    it('does update related items if they have changed',
      function () {

        return VehicleStore.store({
          value: 'relation-1'
        }).then(function (relation) {
          // Clone in order to rule out side-effects
          relation = _.clone(relation);

          relation.value = 'relation-2';

          return Store.store({
            value: 'test-1',
            vehicles: [relation]
          })
            .then(function (item) {

              VehicleStore.find()
                .then(function (relations) {
                  expect(relations.length).to.equal(1);
                  expect(_.first(relations).id).to.equal(relation.id);
                  expect(_.first(relations).rev).not.to.equal(relation.rev);
                });
            });
        });

      });
  });

  describe('using hasOne() and store(:new)', function () {

    it('stores the related item, when saving the parent item',
      function () {

        return Store.store({
          value: 'test',
          boat: {
            value: 'relation'
          }
        })
          .then(function (item) {

            BoatStore.find()
              .then(function (relations) {
                expect(relations.length).to.equal(1);
                expect(_.first(relations).id).to.exist;
                expect(_.first(relations).id).to.equal(item.boat.id);
              });
          });
      });


    it('does not update related item if it has not changed',
      function () {

        return BoatStore.store({
          value: 'relation-1'
        }).then(function (relation) {
          // Clone in order to rule out side-effects
          relation = _.clone(relation);

          var testItem = {
            value: 'test-1',
            boat: relation
          };

          Store.store(testItem)
            .then(function (item) {

              BoatStore.find()
                .then(function (relations) {
                  expect(relations.length).to.equal(1);
                  expect(_.first(relations).id).to.equal(relation.id);
                  expect(_.first(relations).rev).to.equal(relation.rev);
                });
            });
        });

      });

    it('does update related item if it has changed',
      function () {

        var itemToCompare;

        return BoatStore.store({
          value: 'relation-1'
        })
          .then(function (relation) {

            // Clone in order to rule out side-effects
            itemToCompare = _.clone(relation);
            relation = _.clone(relation);

            relation.value = 'relation-2';

            var testItem = {
              value: 'test-1',
              boat: relation
            };

            return Store.store(testItem);
          })
          .then(function (item) {
            return BoatStore.find();
          })
          .then(function (relations) {
            expect(relations.length).to.equal(1);
            expect(_.first(relations).id).to.equal(itemToCompare.id);
            expect(_.first(relations).rev).not.to.equal(itemToCompare.rev);
          });
      });
  });

  describe('using hasOne() and store(:existing)', function () {

    it('updates the related item, when updating the parent item',
      function () {

        var itemToCompare;

        return Store.store({
          value: 'test',
          boat: {
            value: 'relation'
          }
        })
          .then(function (item) {
            itemToCompare = _.clone(item.boat);

            item.value = 'changed';
            item.boat.value = 'relation-changed';

            return Store.store(item);
          })
          .then(function (item) {
            return BoatStore.find();
          })
          .then(function (relations) {
            expect(relations.length).to.equal(1);
            expect(_.first(relations).id).to.equal(itemToCompare.id);
            expect(_.first(relations).rev).not.to.equal(itemToCompare.rev);
          });
      });

    it('does not update the related item, when updating the parent item, if it has not changed',
      function () {

        var itemToCompare;

        return Store.store({
          value: 'test',
          boat: {
            value: 'relation'
          }
        })
          .then(function (item) {
            itemToCompare = _.clone(item.boat);

            item.value = 'changed';

            return Store.store(item);
          })
          .then(function (item) {
            return BoatStore.find();
          })
          .then(function (relations) {
            expect(relations.length).to.equal(1);
            expect(_.first(relations).id).to.equal(itemToCompare.id);
            expect(_.first(relations).rev).to.equal(itemToCompare.rev);
          });
      });

    it('updates the related item, when updating the parent item, even if the paren remains unchanged',
      function () {

        var itemToCompare, relationToCompare;

        return Store.store({
          value: 'test',
          boat: {
            value: 'relation'
          }
        })
          .then(function (item) {
            itemToCompare = _.clone(item);
            relationToCompare = _.clone(item.boat);

            item.boat.value = 'relation-changed';

            return Store.store(item);
          })
          // Assert parent item
          .then(function (item) {
            return Store.find();
          })
          .then(function (items) {
            expect(items.length).to.equal(1);
            expect(_.first(items).rev).to.equal(itemToCompare.rev);
          })
          // Assert related item
          .then(function (item) {
            return BoatStore.find();
          })
          .then(function (relations) {
            expect(relations.length).to.equal(1);
            expect(_.first(relations).rev).not.to.equal(relationToCompare.rev);
          });
      });
  });

  describe('using hasMany() and store(:existing)', function () {

    it('updates the related items, when updating the parent item',
      function () {

        var itemToCompare;

        return Store.store({
          value: 'test',
          vehicles: [{
            value: 'relation-1'
          }, {
            value: 'relation-2'
          }]
        })
          .then(function (item) {
            itemToCompare = _.clone(item.vehicles);

            item.value = 'changed';
            item.vehicles[0].value = 'relation-changed';
            item.vehicles[1].value = 'relation-changed';

            return Store.store(item);
          })
          .then(function (item) {
            return VehicleStore.find();
          })
          .then(function (relations) {
            expect(relations.length).to.equal(2);
            expect(relations[0].rev).not.to.equal(itemToCompare[0].rev);
            expect(relations[1].rev).not.to.equal(itemToCompare[1].rev);
          });
        });
  });

  describe('using hasMany() and find()', function () {

    var persistedItem;

    before(function () {
      return Store.store({
        value: 'test',
        vehicles: [{
          value: 'relation-1'
        }, {
          value: 'relation-2'
        }]
      })
        .then(function (item) {
          persistedItem = item;
        });
    });

    it('returns all relations when querying for the parent',
      function () {

        var itemToCompare;

        return Store.find(persistedItem.id)
          .then(function (item) {
            expect(item.vehicles).to.exist();
            expect(item.vehicles.length).to.equal(2);
          });
      });
  });
});
