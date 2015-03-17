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

  describe('adding property validations', function () {

    it('will correctly validate a valid model using type definitions',
      function () {
        var memdown = require('memdown');

        var TestCollection = new PouchDb('tests', {
          db: memdown
        }).collection({
          properties: {
            stringValue: 'string',
            numberValue: 'number',
            dateValue: 'date',
            booleanValue: 'boolean',
            objectValue: 'object',
            arrayValue: 'array'
          }
        });

        var test = TestCollection.new({
          stringValue: 'string',
          numberValue: 123,
          dateValue: new Date(),
          booleanValue: true,
          objectValue: { a: 123 },
          arrayValue: [1,2,3]
        });

        expect(TestCollection.validate(test)).to.equal(true);
        expect(test.validate()).to.equal(true);
      });

    it('will correctly validate a valid model using required definitions',
      function () {
        var memdown = require('memdown');

        var TestCollection = new PouchDb('tests', {
          db: memdown
        }).collection({
          properties: {
            stringValue: { required: true },
            numberValue: { required: true },
            dateValue: { required: true },
            booleanValue: { required: true },
            objectValue: { required: true },
            arrayValue: { required: true }
          }
        });

        var test = TestCollection.new({
          stringValue: 'string',
          numberValue: 123,
          dateValue: new Date(),
          booleanValue: true,
          objectValue: { a: 123 },
          arrayValue: [1,2,3]
        });

        expect(TestCollection.validate(test)).to.equal(true);
        expect(test.validate()).to.equal(true);
      });

    it('will correctly validate a valid model using custom malidations',
      function () {
        var memdown = require('memdown');

        var count = 0;

        function customValidation () {
          count++;
          return true;
        }

        var TestCollection = new PouchDb('tests', {
          db: memdown
        }).collection({
          properties: {
            stringValue: customValidation,
            numberValue: customValidation,
            dateValue: customValidation,
            booleanValue: customValidation,
            objectValue: customValidation,
            arrayValue: customValidation
          }
        });

        var test = TestCollection.new({
          stringValue: 'string',
          numberValue: 123,
          dateValue: new Date(),
          booleanValue: true,
          objectValue: { a: 123 },
          arrayValue: [1,2,3]
        });

        expect(TestCollection.validate(test)).to.equal(true);
        expect(count).to.equal(6);

        count = 0;
        expect(test.validate()).to.equal(true);
        expect(count).to.equal(6);
      });


    it('will fail validating invalid strings',
      function () {
        var memdown = require('memdown');

        var TestCollection = new PouchDb('tests', {
          db: memdown
        }).collection({
          properties: {
            value: 'string'
          }
        });

        var test = TestCollection.new({
          value: 123
        });

        expect(TestCollection.validate(test)).to.equal(false);
        expect(test.validate()).to.equal(false);
      });

    it('will fail validating invalid numbers',
      function () {
        var memdown = require('memdown');

        var TestCollection = new PouchDb('tests', {
          db: memdown
        }).collection({
          properties: {
            value: 'number'
          }
        });

        var test = TestCollection.new({
          value: 'string'
        });

        expect(TestCollection.validate(test)).to.equal(false);
        expect(test.validate()).to.equal(false);
      });

    it('will fail validating invalid dates',
        function () {
          var memdown = require('memdown');

          var TestCollection = new PouchDb('tests', {
            db: memdown
          }).collection({
            properties: {
              value: 'date'
            }
          });

          var test = TestCollection.new({
            value: 'string'
          });

          expect(TestCollection.validate(test)).to.equal(false);
          expect(test.validate()).to.equal(false);
        });


    it('will fail validating invalid boolean',
        function () {
          var memdown = require('memdown');

          var TestCollection = new PouchDb('tests', {
            db: memdown
          }).collection({
            properties: {
              value: 'boolean'
            }
          });

          var test = TestCollection.new({
            value: undefined
          });

          expect(TestCollection.validate(test)).to.equal(false);
          expect(test.validate()).to.equal(false);
        });

    it('will fail validating invalid objects',
        function () {
          var memdown = require('memdown');

          var TestCollection = new PouchDb('tests', {
            db: memdown
          }).collection({
            properties: {
              value: 'object'
            }
          });

          var test = TestCollection.new({
            value: []
          });

          expect(TestCollection.validate(test)).to.equal(false);
          expect(test.validate()).to.equal(false);
        });

    it('will fail validating invalid arrays',
        function () {
          var memdown = require('memdown');

          var TestCollection = new PouchDb('tests', {
            db: memdown
          }).collection({
            properties: {
              value: 'array'
            }
          });

          var test = TestCollection.new({
            value: {}
          });

          expect(TestCollection.validate(test)).to.equal(false);
          expect(test.validate()).to.equal(false);
        });
  });
});
