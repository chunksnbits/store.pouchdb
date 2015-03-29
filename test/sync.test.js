/* jshint node:true */
/* global describe, afterEach, before, beforeEach, it */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';

var PouchDb = require('pouchdb');
var PouchDbStore = require('../index');

var expect = require('chai').expect;
var http = require('http');
var isNode = require('detect-node');

var pouch, syncStore;

PouchDb.plugin(PouchDbStore);

describe('Testing shelfdb sync', function () {

  before(function () {
    syncStore = new PouchDb('sync', isNode ? { db: require('memdown') } : {}).store();
  });

  beforeEach(function () {
    pouch = new PouchDb('test', isNode ? { db: require('memdown') } : {});
  });

  describe('using sync', function () {

    it('will create a sync connection when using sync() with a string argument',
      function () {
        var store = pouch.store();

        var sync = store.sync('http://localhost:1234/remote/sync');

        expect(sync).to.exist;
        expect(store._sync).to.exist;
        expect(sync).to.equal(store._sync);
        expect(sync.canceled).to.equal(false);
      });

    it('will create a sync connection when using sync() with a store argument',
      function () {
        var store = pouch.store();

        var syncStore = new PouchDb('sync', isNode ? { db: require('memdown') } : {}).store();

        var sync = store.sync(syncStore);

        expect(sync).to.exist;
        expect(store._sync).to.exist;
        expect(sync).to.equal(store._sync);
        expect(sync.canceled).to.equal(false);
      });

    it('will create a sync connection when using sync() with a pouchdb argument',
      function () {
        var store = pouch.store();

        var syncStore = new PouchDb('sync', isNode ? { db: require('memdown') } : {});

        var sync = store.sync(syncStore);

        expect(sync).to.exist;
        expect(store._sync).to.exist;
        expect(sync).to.equal(store._sync);
        expect(sync.canceled).to.equal(false);
      });

    it('will create a sync connection when providing sync option on initialization',
      function () {
        var store = pouch.store({
          sync: 'http://localhost:1234/remote/sync'
        });

        var sync = store.sync();

        expect(sync).to.exist;
        expect(store._sync).to.exist;
        expect(sync).to.equal(store._sync);
        expect(sync.canceled).to.equal(false);
      });
  });
});
