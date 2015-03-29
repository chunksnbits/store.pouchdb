/* jshint node:true */
/* global describe, afterEach, beforeEach, it, catchIt */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';

var PouchDb = require('pouchdb');
var PouchDbStore = require('../index');

var expect = require('chai').expect;
var http = require('http');

var isNode = require('detect-node');

//
// This is a backend-only part of the implementation.
// No use letting it run on the browser, as it would fail
// on the requirements.
//
if (isNode) {

  var app, server, pouch;

  PouchDb.plugin(PouchDbStore);

  describe('Testing shelfdb server', function () {

    beforeEach(function () {
      var express = require('express');
      app = express();

      pouch = new PouchDb('test', { db: require('memdown') });
    });

    afterEach(function () {
      server.close();
    });

    describe('using store.listen()', function () {

      it('will attach the store to the server app',
        function (done) {

          var store = pouch.store();

          store.listen(app);

          server = app.listen(1234);

          http.get('http://localhost:1234/test', function (response) {
            expect(response.statusCode).to.be.equal(200);
            done();
          })
          .on('error', function(error) {
            done(error);
          });
        });

        it('will correctly use option "root"', function (done) {

            var store = pouch.store();

            store.listen(app, { root: '/store' });

            server = app.listen(1234);

            http.get('http://localhost:1234/store/test', function (response) {
              expect(response.statusCode).to.be.equal(200);
              done();
            })
            .on('error', function(error) {
              done(error);
            });
        });
    });

    describe('using initialization options', function () {

      it('will attach the store to the server app',
        function (done) {

          var store = pouch.store({ listen: app });

          server = app.listen(1234);

          http.get('http://localhost:1234/test', function (response) {
            expect(response.statusCode).to.be.equal(200);
            done();
          })
          .on('error', function(error) {
            done(error);
          });
        });

        it('will correctly use option "root"', function (done) {

            var store = pouch.store({ listen: app, root: '/store' });

            server = app.listen(1234);

            http.get('http://localhost:1234/store/test', function (response) {
              expect(response.statusCode).to.be.equal(200);
              done();
            })
            .on('error', function(error) {
              done(error);
            });
        });
    });
  });
}
