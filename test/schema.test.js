/* jshint node:true */
/* global describe, after, before, it, catchIt */

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

var pouch, sampleData = {};

PouchDb.plugin(PouchDbStore);

function clearAllDocs (pouch) {
  return pouch.allDocs()
    .then(function (response) {
      return q.all(_.map(response.rows, function (row) {
        return pouch.remove(row.id, row.value.rev);
      }));
    });
}

var options = isNode ? {
  defaultStore: {
    db: require('memdown')
  },
  associatedStore: {
    db: require('leveldown')
  }
} : {
  defaultStore: {
    adapter: 'websql'
  },
  associatedStore: {
    adapter: 'websql'
  }
};

describe('Testing shelfdb schema', function () {

  after(function () {
    if (isNode) {
      var fs = require('fs.extra');

      fs.rmrfSync('./tracks');
      fs.rmrfSync('./artists');
      fs.rmrfSync('./labels');
      fs.rmrfSync('./likes');
    }
  });

  describe('allows to add hasMany relations', function () {

    it('will automatically infer the store by name, if providing a name only on hasMany()',
      function () {
        var RecordStore = new PouchDb('records', options.defaultStore).store();
        RecordStore.hasMany('tracks');

        var TrackStore = RecordStore._schema.hasMany.tracks;

        expect(TrackStore.toString()).to.equal('[object Store]');
        expect(TrackStore._adapter.pouch._db_name).to.equal('tracks');
        expect(TrackStore._adapter.pouch.__opts.db).to.equal(options.defaultStore.db);
      });

    it('will add a hasMany relation given the name of the relation and the name of the store to use for the relation',
      function () {
        var RecordStore = new PouchDb('records', options.defaultStore).store();
        RecordStore.hasMany('items', 'tracks');

        var TestStore = RecordStore._schema.hasMany.items;

        expect(TestStore.toString()).to.equal('[object Store]');
        expect(TestStore._adapter.pouch._db_name).to.equal('tracks');
        expect(TestStore._adapter.pouch.__opts.db).to.equal(options.defaultStore.db);
      });

    it('will add a hasMany relation given the name and a store to use for the relation',
      function () {
        var RecordStore = new PouchDb('playlists', options.defaultStore).store();
        var TrackStore = new PouchDb('tracks', options.associatedStore).store();
        RecordStore.hasMany('tracks', TrackStore);
        var TestStore = RecordStore._schema.hasMany.tracks;

        expect(TestStore.toString()).to.equal('[object Store]');
        expect(TestStore._adapter.pouch._db_name).to.equal('tracks');
        expect(TestStore._adapter.pouch.__opts.db).to.equal(options.associatedStore.db);
      });

    it('will allow to add nested hasMany relations when providing a store as the relation',
      function () {
        var RecordStore = new PouchDb('playlists', options.defaultStore).store();
        var TrackStore = new PouchDb('tracks', options.associatedStore).store();

        TrackStore.hasMany('likes');
        RecordStore.hasMany('tracks', TrackStore);

        var TestStore = RecordStore._schema.hasMany.tracks;
        var LikeStore = TestStore._schema.hasMany.likes;

        expect(LikeStore.toString()).to.equal('[object Store]');
        expect(LikeStore._adapter.pouch._db_name).to.equal('likes');
        expect(LikeStore._adapter.pouch.__opts.db).to.equal(options.associatedStore.db);
      });

    it('will not add nested hasMany relations when providing the store by name',
      function () {
        var RecordStore = new PouchDb('playlists', options.defaultStore).store();

        var TrackStore = new PouchDb('tracks', options.associatedStore).store();

        TrackStore.hasMany('likes');
        RecordStore.hasMany('tracks');

        var TestStore = RecordStore._schema.hasMany.tracks;

        expect(TestStore._schema.likes).to.equal(undefined);
      });
  });

  describe('allows to add hasMany relations', function () {

    it('will automatically infer the store by name, if providing a name only on hasOne()',
      function () {
        var TrackStore = new PouchDb('tracks', options.defaultStore).store();

        TrackStore.hasOne('artist');

        var ArtistStore = TrackStore._schema.hasOne.artist;

        expect(ArtistStore.toString()).to.equal('[object Store]');
        expect(ArtistStore._adapter.pouch._db_name).to.equal('artist');
        expect(ArtistStore._adapter.pouch.__opts.db).to.equal(options.defaultStore.db);
      });

    it('will add a hasOne relation given the name of the relation and the name of the store to use for the relation',
      function () {
        var TrackStore = new PouchDb('tracks', options.defaultStore).store();

        TrackStore.hasOne('artist', 'artists');

        var ArtistStore = TrackStore._schema.hasOne.artist;

        expect(ArtistStore.toString()).to.equal('[object Store]');
        expect(ArtistStore._adapter.pouch._db_name).to.equal('artists');
        expect(ArtistStore._adapter.pouch.__opts.db).to.equal(options.defaultStore.db);
      });

    it('will add a hasOne relation given the name and a store to use for the relation',
      function () {
        var TrackStore = new PouchDb('tracks', options.defaultStore).store();
        var AritstCollection = new PouchDb('artists', options.associatedStore).store();

        TrackStore.hasOne('artist', AritstCollection);

        var TestStore = TrackStore._schema.hasOne.artist;

        expect(TestStore.toString()).to.equal('[object Store]');
        expect(TestStore._adapter.pouch._db_name).to.equal('artists');
        expect(TestStore._adapter.pouch.__opts.db).to.equal(options.associatedStore.db);
      });

    it('will allow to add nested hasOne relations when providing a store as the relation',
      function () {
        var TrackStore = new PouchDb('tracks', options.defaultStore).store();
        var ArtistStore = new PouchDb('artists', options.associatedStore).store();

        TrackStore.hasOne('artist', ArtistStore);
        ArtistStore.hasOne('label', 'labels');

        var TestStore = TrackStore._schema.hasOne.artist;
        var LabelStore = TestStore._schema.hasOne.label;

        expect(LabelStore.toString()).to.equal('[object Store]');
        expect(LabelStore._adapter.pouch._db_name).to.equal('labels');
        expect(LabelStore._adapter.pouch.__opts.db).to.equal(options.associatedStore.db);
      });

    it('will not add nested hasOne relations when providing the store by name',
      function () {
        var TrackStore = new PouchDb('tracks', options.defaultStore).store();
        var ArtistStore = new PouchDb('artists', options.associatedStore).store();

        TrackStore.hasOne('artist', 'artists');
        ArtistStore.hasOne('label', 'labels');

        var TestStore = TrackStore._schema.hasOne.artist;

        expect(TestStore._schema.likes).to.equal(undefined);
      });
  });
});
