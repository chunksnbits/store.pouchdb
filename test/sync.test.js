/* jshint node:true */
/* global describe, afterEach, beforeEach, it, catchIt */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';

var PouchDb = require('pouchdb');
var PouchDbStore = require('../index');

var expect = require('chai').expect;
var http = require('http');

var pouch;

PouchDb.plugin(PouchDbStore);

describe('Testing shelfdb sync', function () {

  beforeEach(function () {
    pouch = new PouchDb('test', { db: require('memdown') });
  });

  describe('using sync', function () {

    it('will create a sync connection when applying sync() for this store',
      function () {
        var store = pouch.store();

        var sync = store.sync('http://localhost:1234/sync/to');

        expect(sync).to.exist;
        expect(store._sync).to.exist;
        expect(sync).to.equal(store._sync);
        expect(sync.canceled).to.equal(false);
      });

    it('will create a sync connection when providing sync option on initialization',
      function () {
        var store = pouch.store({
          sync: 'http://localhost:1234/sync/to'
        });

        var sync = store.sync();

        expect(sync).to.exist;
        expect(store._sync).to.exist;
        expect(sync).to.equal(store._sync);
        expect(sync.canceled).to.equal(false);
      });
  });
});
