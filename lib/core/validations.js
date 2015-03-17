/* jshint node:true */
'use strict';

var _ = require('lodash');

var ExceptionHandler = require ('./exception-handler');

function ValidationService () {}

ValidationService.strategies = {
  string: function (property) {
    return _.isString(property);
  },
  number: function (property) {
    return _.isNumber(property) && !_.isNaN(property);
  },
  boolean: function (property) {
    return _.isBoolean(property);
  },
  date: function (property) {
    return _.isDate(property);
  },
  object: function (property) {
    return _.isObject(property) && !_.isArray(property);
  },
  array: function (property) {
    return _.isArray(property);
  }
};

ValidationService.prototype.validate = function (item, schema) {
  _.each(schema, function (validations, key) {
    var value = item[key];

    this._validateRequired(value, validations.required, key);
    this._validateType(value, validations.type, key);
    this._validateCustomValidation(item, value, validations.validate, key);
  }, this);

  return true;
};



ValidationService.prototype._validateRequired = function (value, required, key) {
  if (!required) {
    return;
  }

  if (!value && value !== false) {
    throw ExceptionHandler.create('ShelfInvalidValidationException',
      'There was an error validating field: ' + key + '. ' +
      'Expected required field to be not empty.'
    );
  }
};


ValidationService.prototype._validateType = function (value, type, key) {
  if (!type) {
    return;
  }

  if (!ValidationService.strategies[type](value)) {
    throw ExceptionHandler.create('ShelfInvalidValidationException',
      'There was an error validating field: ' + key + '. ' +
      'Expected type: ' + type + ', was: ' + (typeof value)
    );
  }
};


ValidationService.prototype._validateCustomValidation = function (item, value, validation, key) {
  if (!validation) {
    return;
  }

  if (_.isRegExp(validation) && !validation.test(value)) {
    throw ExceptionHandler.create('ShelfInvalidValidationException',
      'There was an error validating field: ' + key + '. ' +
      'Validating ' + validation + ' failed.'
    );
  }
  else if (!validation.call(item, value)) {
    throw ExceptionHandler.create('ShelfInvalidValidationException',
      'There was an error validating field: ' + key + '. ' +
      'A custom validation returned failed.'
    );
  }
};

module.exports = new ValidationService();
