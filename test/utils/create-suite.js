/* jshint node:true */
'use strict';

var fs = require('fs');
var _ = require('lodash');

function collectTests (path) {
  var tests;

  var filenames = fs.readdirSync(path);

  return _.filter(filenames, function (filename) {
    return /\.test\.js$/.test(filename);
  });
}

function createSuite (tests) {
  return _.map(tests, function (filename) {
    return 'require("../test/' + filename + '");';
  }).join('\n');
}

function writeSuite (target, source) {
  return fs.writeFileSync(target, source);
}

var filenames = collectTests(__dirname + '/../');
var source = createSuite(filenames);

writeSuite(__dirname + '/../../tmp/suite.js', source);
