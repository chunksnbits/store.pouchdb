/* jshint node:true */
'use strict';

// ----------------------------------------------------------------- Initialization
// ------------------------------------------------------------ Dependencies
// ------------------------------------------------------- Libraries
var _ = require('lodash');

// ------------------------------------------------------- Internal
var ExceptionHandler = require('./exception-handler');


var protectedProperties = [
  'save',
  'rev',
  '_collection',
  '__collection'
];

// ------------------------------------------------------------ Object creation
// ------------------------------------------------------- Constructor
/**
 * @description
 *  Constructor method for the model instance class.
 *  Creates a new model instance.
 *
 *  @params:
 *    [data]: A plain object holding the initial data for the object instance
 *            to create.
 *
 *  @returns:
 *    [ModelInstance]: The newly created model instance.
 */
function ModelInstance(collection, data) {

  if (typeof data === '[' + collection.name + ' ModelInstance]') {
    return data;
  }

  if (!data.rev) {
    _.each(protectedProperties, function (key) {
      if (data[key] !== undefined) {
        throw ExceptionHandler.create('ShelfProtectedPropertyException',
          [
            'There was an exception creating a new model instance. The attributes',
            '"' + protectedProperties.join('", "') + '" are protected and cannot',
            'be assigned'
          ].join(' '));
      }
    });
  }

  _.extend(this, data, {

    // The collection to persist this model instance to.
    __collection: collection,

    // Stores collection for reference in case this is a related item.
    _collection: collection._name,

    // Overwrite default toString to print the proper filename.
    toString: function () {
      return '[object ModelInstance]';
    }
  });
}


// ----------------------------------------------------------------- Public interface
// ------------------------------------------------------------ Persistance
/**
 * @description
 *  Persistance method for this model instance.
 *  Persists this instance in the associated collection.
 *
 *  @returns:
 *    [Promise]: A promise that will be resolved once
 *               the item has been persisted.
 */
ModelInstance.prototype.save = function () {
  return this.__collection.store(this);
};

// ------------------------------------------------------------ Deletion
/**
 * @description
 *  Deletion method for this model instance.
 *  Deletes this instance from the associated collection.
 *
 *  @returns:
 *    [Promise]: A promise that will be resolved once
 *               the item has been deleted.
 */
ModelInstance.prototype.delete = function () {
  return this.__collection.remove(this);
};

// ------------------------------------------------------------ Validation
/**
 * @description
 *  Validates this model instance.
 *  A model instance is considered valid if it follows all rules assigned
 *  as specified in it's collection property schema.
 *
 *
 *  @returns:
 *    [boolean]: True if this model instance is valid, false if not.
 */
ModelInstance.prototype.validate = function () {
  return this.__collection.validate(this);
};

module.exports = ModelInstance;
