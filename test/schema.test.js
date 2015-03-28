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

var fs = require('fs.extra');

require('mocha-qa').global();

var RecordStore, pouch, sampleData = {};

PouchDb.plugin(PouchDbStore);

function clearAllDocs (pouch) {
  return pouch.allDocs()
    .then(function (response) {
      return q.all(_.map(response.rows, function (row) {
        return pouch.remove(row.id, row.value.rev);
      }));
    });
}

describe('Testing shelfdb schema', function () {

  after(function () {
    fs.rmrfSync('./tracks');
    fs.rmrfSync('./artists');
    fs.rmrfSync('./labels');
    fs.rmrfSync('./likes');
  });

  describe('allows to add hasMany relations', function () {

    it('will automatically infer the store by name, if providing a name only on hasMany()',
      function () {
        var memdown = require('memdown');

        RecordStore = new PouchDb('playlists', {
          db: memdown
        }).store();

        RecordStore.hasMany('tracks');

        var TrackStore = RecordStore._schema.hasMany.tracks;

        expect(TrackStore.toString()).to.equal('[object Store]');
        expect(TrackStore._adapter.pouch._db_name).to.equal('tracks');
        expect(TrackStore._adapter.pouch.__opts.db).to.equal(memdown);
      });

    it('will add a hasMany relation given the name of the relation and the name of the store to use for the relation',
      function () {
        var memdown = require('memdown');

        RecordStore = new PouchDb('playlists', {
          db: memdown
        }).store();

        RecordStore.hasMany('items', 'tracks');

        var TestStore = RecordStore._schema.hasMany.items;

        expect(TestStore.toString()).to.equal('[object Store]');
        expect(TestStore._adapter.pouch._db_name).to.equal('tracks');
        expect(TestStore._adapter.pouch.__opts.db).to.equal(memdown);
      });

    it('will add a hasMany relation given the name and a store to use for the relation',
      function () {
        var leveldown = require('leveldown');

        RecordStore = new PouchDb('playlists', {
          db: require('memdown')
        }).store();

        var TrackStore = new PouchDb('tracks', {
          db: leveldown
        }).store();

        RecordStore.hasMany('tracks', TrackStore);

        var TestStore = RecordStore._schema.hasMany.tracks;

        expect(TestStore.toString()).to.equal('[object Store]');
        expect(TestStore._adapter.pouch._db_name).to.equal('tracks');
        expect(TestStore._adapter.pouch.__opts.db).to.equal(leveldown);
      });

    it('will allow to add nested hasMany relations when providing a store as the relation',
      function () {
        var leveldown = require('leveldown');

        RecordStore = new PouchDb('playlists', {
          db: require('memdown')
        }).store();

        var TrackStore = new PouchDb('tracks', {
          db: leveldown
        }).store();

        TrackStore.hasMany('likes');

        RecordStore.hasMany('tracks', TrackStore);

        var TestStore = RecordStore._schema.hasMany.tracks;

        var LikeStore = TestStore._schema.hasMany.likes;

        expect(LikeStore.toString()).to.equal('[object Store]');
        expect(LikeStore._adapter.pouch._db_name).to.equal('likes');
        expect(LikeStore._adapter.pouch.__opts.db).to.equal(leveldown);
      });

    it('will not add nested hasMany relations when providing the store by name',
      function () {
        var leveldown = require('leveldown');

        RecordStore = new PouchDb('playlists', {
          db: require('memdown')
        }).store();

        var TrackStore = new PouchDb('tracks', {
          db: leveldown
        }).store();

        TrackStore.hasMany('likes');
        RecordStore.hasMany('tracks');

        var TestStore = RecordStore._schema.hasMany.tracks;

        expect(TestStore._schema.likes).to.equal(undefined);
      });
  });

  describe('allows to add hasMany relations', function () {

    it('will automatically infer the store by name, if providing a name only on hasOne()',
      function () {
        var memdown = require('memdown');

        var TrackStore = new PouchDb('tracks', {
          db: memdown
        }).store();

        TrackStore.hasOne('artist');

        var ArtistStore = TrackStore._schema.hasOne.artist;

        expect(ArtistStore.toString()).to.equal('[object Store]');
        expect(ArtistStore._adapter.pouch._db_name).to.equal('artist');
        expect(ArtistStore._adapter.pouch.__opts.db).to.equal(memdown);
      });

    it('will add a hasOne relation given the name of the relation and the name of the store to use for the relation',
      function () {
        var memdown = require('memdown');

        var TrackStore = new PouchDb('tracks', {
          db: memdown
        }).store();

        TrackStore.hasOne('artist', 'artists');

        var ArtistStore = TrackStore._schema.hasOne.artist;

        expect(ArtistStore.toString()).to.equal('[object Store]');
        expect(ArtistStore._adapter.pouch._db_name).to.equal('artists');
        expect(ArtistStore._adapter.pouch.__opts.db).to.equal(memdown);
      });

    it('will add a hasOne relation given the name and a store to use for the relation',
      function () {
        var leveldown = require('leveldown');

        var TrackStore = new PouchDb('tracks', {
          db: require('memdown')
        }).store();

        var AritstCollection = new PouchDb('artists', {
          db: leveldown
        }).store();

        TrackStore.hasOne('artist', AritstCollection);

        var TestStore = TrackStore._schema.hasOne.artist;

        expect(TestStore.toString()).to.equal('[object Store]');
        expect(TestStore._adapter.pouch._db_name).to.equal('artists');
        expect(TestStore._adapter.pouch.__opts.db).to.equal(leveldown);
      });

    it('will allow to add nested hasOne relations when providing a store as the relation',
      function () {
        var leveldown = require('leveldown');

        var TrackStore = new PouchDb('tracks', {
          db: require('memdown')
        }).store();

        var ArtistStore = new PouchDb('artists', {
          db: leveldown
        }).store();

        TrackStore.hasOne('artist', ArtistStore);
        ArtistStore.hasOne('label', 'labels');

        var TestStore = TrackStore._schema.hasOne.artist;
        var LabelStore = TestStore._schema.hasOne.label;

        expect(LabelStore.toString()).to.equal('[object Store]');
        expect(LabelStore._adapter.pouch._db_name).to.equal('labels');
        expect(LabelStore._adapter.pouch.__opts.db).to.equal(leveldown);
      });

    it('will not add nested hasOne relations when providing the store by name',
      function () {
        var leveldown = require('leveldown');

        var TrackStore = new PouchDb('tracks', {
          db: require('memdown')
        }).store();

        var ArtistStore = new PouchDb('artists', {
          db: leveldown
        }).store();

        TrackStore.hasOne('artist', 'artists');
        ArtistStore.hasOne('label', 'labels');

        var TestStore = TrackStore._schema.hasOne.artist;

        expect(TestStore._schema.likes).to.equal(undefined);
      });
  });
});
