/* jshint node:true */
/* global describe, after, before, it, catchIt */

// Ignores "Expected an assignment or function call and instead saw an expression"
/* jshint -W030 */

'use strict';

var PouchDb = require('pouchdb');
var PouchDbStore = require('../index');

var expect = require('chai').expect;

var _ = require('lodash');
var q = require('q');

require('mocha-qa').global();

var Store, pouch, sampleData = {};

PouchDb.plugin(PouchDbStore);

function clearAllDocs (pouch) {
  return pouch.allDocs()
    .then(function (response) {
      return q.all(_.map(response.rows, function (row) {
        return pouch.remove(row.id, row.value.rev);
      }));
    });
}

describe('Testing shelfdb schema', function(){

  describe('adding property validations', function () {

    it('will correctly validate a valid item using type definitions',
      function () {
        var memdown = require('memdown');

        var Store = new PouchDb('tests', {
          db: memdown
        }).store({
          properties: {
            stringValue: 'string',
            numberValue: 'number',
            dateValue: 'date',
            booleanValue: 'boolean',
            objectValue: 'object',
            arrayValue: 'array'
          }
        });

        var test = Store.new({
          stringValue: 'string',
          numberValue: 123,
          dateValue: new Date(),
          booleanValue: true,
          objectValue: { a: 123 },
          arrayValue: [1,2,3]
        });

        expect(Store.validate(test)).to.equal(true);
        expect(test.validate()).to.equal(true);
      });

    it('will correctly validate a valid item using required definitions',
      function () {
        var memdown = require('memdown');

        var Store = new PouchDb('tests', {
          db: memdown
        }).store({
          properties: {
            stringValue: { required: true },
            numberValue: { required: true },
            dateValue: { required: true },
            booleanValue: { required: true },
            objectValue: { required: true },
            arrayValue: { required: true }
          }
        });

        var test = Store.new({
          stringValue: 'string',
          numberValue: 123,
          dateValue: new Date(),
          booleanValue: true,
          objectValue: { a: 123 },
          arrayValue: [1,2,3]
        });

        expect(Store.validate(test)).to.equal(true);
        expect(test.validate()).to.equal(true);
      });

    it('will correctly validate a valid item using custom malidations',
      function () {
        var memdown = require('memdown');

        var count = 0;

        function customValidation () {
          count++;
          return true;
        }

        var Store = new PouchDb('tests', {
          db: memdown
        }).store({
          properties: {
            stringValue: customValidation,
            numberValue: customValidation,
            dateValue: customValidation,
            booleanValue: customValidation,
            objectValue: customValidation,
            arrayValue: customValidation
          }
        });

        var test = Store.new({
          stringValue: 'string',
          numberValue: 123,
          dateValue: new Date(),
          booleanValue: true,
          objectValue: { a: 123 },
          arrayValue: [1,2,3]
        });

        expect(Store.validate(test)).to.equal(true);
        expect(count).to.equal(6);

        count = 0;
        expect(test.validate()).to.equal(true);
        expect(count).to.equal(6);
      });


    it('will fail validating invalid strings',
      function () {
        var memdown = require('memdown');

        var Store = new PouchDb('tests', {
          db: memdown
        }).store({
          properties: {
            value: 'string'
          }
        });

        var test = Store.new({
          value: 123
        });

        expect(Store.validate(test)).to.equal(false);
        expect(test.validate()).to.equal(false);
      });

    it('will fail validating invalid numbers',
      function () {
        var memdown = require('memdown');

        var Store = new PouchDb('tests', {
          db: memdown
        }).store({
          properties: {
            value: 'number'
          }
        });

        var test = Store.new({
          value: 'string'
        });

        expect(Store.validate(test)).to.equal(false);
        expect(test.validate()).to.equal(false);
      });

    it('will fail validating invalid dates',
        function () {
          var memdown = require('memdown');

          var Store = new PouchDb('tests', {
            db: memdown
          }).store({
            properties: {
              value: 'date'
            }
          });

          var test = Store.new({
            value: 'string'
          });

          expect(Store.validate(test)).to.equal(false);
          expect(test.validate()).to.equal(false);
        });


    it('will fail validating invalid boolean',
        function () {
          var memdown = require('memdown');

          var Store = new PouchDb('tests', {
            db: memdown
          }).store({
            properties: {
              value: 'boolean'
            }
          });

          var test = Store.new({
            value: undefined
          });

          expect(Store.validate(test)).to.equal(false);
          expect(test.validate()).to.equal(false);
        });

    it('will fail validating invalid objects',
        function () {
          var memdown = require('memdown');

          var Store = new PouchDb('tests', {
            db: memdown
          }).store({
            properties: {
              value: 'object'
            }
          });

          var test = Store.new({
            value: []
          });

          expect(Store.validate(test)).to.equal(false);
          expect(test.validate()).to.equal(false);
        });

    it('will fail validating invalid arrays',
        function () {
          var memdown = require('memdown');

          var Store = new PouchDb('tests', {
            db: memdown
          }).store({
            properties: {
              value: 'array'
            }
          });

          var test = Store.new({
            value: {}
          });

          expect(Store.validate(test)).to.equal(false);
          expect(test.validate()).to.equal(false);
        });
  });
});
