/* jshint node:true */
/* global describe, after, before, it, catchIt */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';

var expect = require('chai').expect;
var shelf = require('../index');
var PouchDb = require('pouchdb');
var _ = require('lodash');
var q = require('q');

require('mocha-qa').global();

var testCollection, pouch, sampleData = {};

PouchDb.plugin(shelf);

function clearAllDocs (pouch) {
  return pouch.allDocs()
    .then(function (response) {
      return q.all(_.map(response.rows, function (row) {
        return pouch.remove(row.id, row.value.rev);
      }));
    });
}

describe('Testing shelfdb schema', function(){

  describe('allows to add hasMany relations', function () {

    it('will automatically infer the collection by name, if providing a name only on hasMany()',
      function () {
        var memdown = require('memdown');

        var PlaylistCollection = new PouchDb('playlists', {
          db: memdown
        }).store();

        PlaylistCollection.hasMany('tracks');

        var hasOneCollection = PlaylistCollection._schema.hasMany.tracks;

        expect(hasOneCollection.toString()).to.equal('[object Collection]');
        expect(hasOneCollection._adapter.pouch._db_name).to.equal('tracks');
        expect(hasOneCollection._adapter.pouch.__opts.db).to.equal(memdown);
      });

    it('will add a hasMany relation given the name of the relation and the name of the collection to use for the relation',
      function () {
        var memdown = require('memdown');

        var PlaylistCollection = new PouchDb('playlists', {
          db: memdown
        }).store();

        PlaylistCollection.hasMany('items', 'tracks');

        var hasOneCollection = PlaylistCollection._schema.hasMany.items;

        expect(hasOneCollection.toString()).to.equal('[object Collection]');
        expect(hasOneCollection._adapter.pouch._db_name).to.equal('tracks');
        expect(hasOneCollection._adapter.pouch.__opts.db).to.equal(memdown);
      });

    it('will add a hasMany relation given the name and a collection to use for the relation',
      function () {
        var leveldown = require('leveldown');

        var PlaylistCollection = new PouchDb('playlists', {
          db: require('memdown')
        }).store();

        var TrackCollection = new PouchDb('tracks', {
          db: leveldown
        }).store();

        PlaylistCollection.hasMany('tracks', TrackCollection);

        var hasOneCollection = PlaylistCollection._schema.hasMany.tracks;

        expect(hasOneCollection.toString()).to.equal('[object Collection]');
        expect(hasOneCollection._adapter.pouch._db_name).to.equal('tracks');
        expect(hasOneCollection._adapter.pouch.__opts.db).to.equal(leveldown);
      });

    it('will allow to add nested hasMany relations when providing a collection as the relation',
      function () {
        var leveldown = require('leveldown');

        var PlaylistCollection = new PouchDb('playlists', {
          db: require('memdown')
        }).store();

        var TrackCollection = new PouchDb('tracks', {
          db: leveldown
        }).store();

        TrackCollection.hasMany('likes');

        PlaylistCollection.hasMany('tracks', TrackCollection);

        var hasOneCollection = PlaylistCollection._schema.hasMany.tracks;
        var likesCollection = hasOneCollection._schema.hasMany.likes;

        expect(likesCollection.toString()).to.equal('[object Collection]');
        expect(likesCollection._adapter.pouch._db_name).to.equal('likes');
        expect(likesCollection._adapter.pouch.__opts.db).to.equal(leveldown);
      });

    it('will not add nested hasMany relations when providing the collection by name',
      function () {
        var leveldown = require('leveldown');

        var PlaylistCollection = new PouchDb('playlists', {
          db: require('memdown')
        }).store();

        var TrackCollection = new PouchDb('tracks', {
          db: leveldown
        }).store();

        TrackCollection.hasMany('likes');

        PlaylistCollection.hasMany('tracks');

        var hasOneCollection = PlaylistCollection._schema.hasMany.tracks;

        expect(hasOneCollection._schema.likes).to.equal(undefined);
      });
  });

  describe('allows to add hasMany relations', function () {

    it('will automatically infer the collection by name, if providing a name only on hasOne()',
      function () {
        var memdown = require('memdown');

        var TrackCollection = new PouchDb('tracks', {
          db: memdown
        }).store();

        TrackCollection.hasOne('artist');

        var hasOneCollection = TrackCollection._schema.hasOne.artist;

        expect(hasOneCollection.toString()).to.equal('[object Collection]');
        expect(hasOneCollection._adapter.pouch._db_name).to.equal('artist');
        expect(hasOneCollection._adapter.pouch.__opts.db).to.equal(memdown);
      });

    it('will add a hasOne relation given the name of the relation and the name of the collection to use for the relation',
      function () {
        var memdown = require('memdown');

        var TrackCollection = new PouchDb('tracks', {
          db: memdown
        }).store();

        TrackCollection.hasOne('artist', 'artists');

        var hasOneCollection = TrackCollection._schema.hasOne.artist;

        expect(hasOneCollection.toString()).to.equal('[object Collection]');
        expect(hasOneCollection._adapter.pouch._db_name).to.equal('artists');
        expect(hasOneCollection._adapter.pouch.__opts.db).to.equal(memdown);
      });

    it('will add a hasOne relation given the name and a collection to use for the relation',
      function () {
        var leveldown = require('leveldown');

        var TrackCollection = new PouchDb('tracks', {
          db: require('memdown')
        }).store();

        var AritstCollection = new PouchDb('artists', {
          db: leveldown
        }).store();

        TrackCollection.hasOne('artist', AritstCollection);

        var hasOneCollection = TrackCollection._schema.hasOne.artist;

        expect(hasOneCollection.toString()).to.equal('[object Collection]');
        expect(hasOneCollection._adapter.pouch._db_name).to.equal('artists');
        expect(hasOneCollection._adapter.pouch.__opts.db).to.equal(leveldown);
      });

    it('will allow to add nested hasOne relations when providing a collection as the relation',
      function () {
        var leveldown = require('leveldown');

        var TrackCollection = new PouchDb('tracks', {
          db: require('memdown')
        }).store();

        var ArtistCollection = new PouchDb('artists', {
          db: leveldown
        }).store();

        TrackCollection.hasOne('artist', ArtistCollection);
        ArtistCollection.hasOne('label', 'labels');

        var hasOneCollection = TrackCollection._schema.hasOne.artist;
        var labelsCollection = hasOneCollection._schema.hasOne.label;

        expect(labelsCollection.toString()).to.equal('[object Collection]');
        expect(labelsCollection._adapter.pouch._db_name).to.equal('labels');
        expect(labelsCollection._adapter.pouch.__opts.db).to.equal(leveldown);
      });

    it('will not add nested hasOne relations when providing the collection by name',
      function () {
        var leveldown = require('leveldown');

        var TrackCollection = new PouchDb('tracks', {
          db: require('memdown')
        }).store();

        var ArtistCollection = new PouchDb('artists', {
          db: leveldown
        }).store();

        TrackCollection.hasOne('artist', 'artists');
        ArtistCollection.hasOne('label', 'labels');

        var hasOneCollection = TrackCollection._schema.hasOne.artist;

        expect(hasOneCollection._schema.likes).to.equal(undefined);
      });
  });
});
