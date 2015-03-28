/* jshint node:true */
'use strict';

// ----------------------------------------------------------------- Initialization
// ------------------------------------------------------------ Dependencies
// ------------------------------------------------------- Libraries
var _ = require('lodash');

// ------------------------------------------------------- Internal
var ExceptionHandler = require('./exception-handler');
var ValidationService = require('./validations');

var protectedProperties = [
  'save',
  'rev',
  '_store',
  '__store'
];

// ------------------------------------------------------------ Object creation
// ------------------------------------------------------- Constructor
/**
 * @description
 *  Constructor method for the item class.
 *  Creates a new item.
 *
 *  @params:
 *    [data]: A plain object holding the initial data for the object instance
 *            to create.
 *
 *  @returns:
 *    [Item]: The newly created item.
 */
function Item(store, data) {

  if (data instanceof Item) {
    return data;
  }

  if (!data.rev) {
    _.each(protectedProperties, function (key) {
      if (data[key] !== undefined) {
        throw ExceptionHandler.create('ShelfProtectedPropertyException',
          [
            'There was an exception creating a new item. The attributes',
            '"' + protectedProperties.join('", "') + '" are protected and cannot',
            'be assigned'
          ].join(' '));
      }
    });
  }

  _.extend(this, data, {

    // The store to persist this item to.
    __store: store,

    // Stores store for reference in case this is a related item.
    _store: store._name,

    // Overwrite default toString to print the proper filename.
    toString: function () {
      return '[object Item]';
    }
  });
}


// ----------------------------------------------------------------- Public interface
// ------------------------------------------------------------ Persistance
/**
 * @description
 *  Persistance method for this item.
 *  Persists this instance in the associated store.
 *
 *  @returns:
 *    [Promise]: A promise that will be resolved once
 *               the item has been persisted.
 */
Item.prototype.save = function () {
  return this.__store.store(this);
};

// ------------------------------------------------------------ Deletion
/**
 * @description
 *  Deletion method for this item.
 *  Deletes this instance from the associated store.
 *
 *  @returns:
 *    [Promise]: A promise that will be resolved once
 *               the item has been deleted.
 */
Item.prototype.delete = function () {
  return this.__store.remove(this);
};

// ------------------------------------------------------------ Validation
/**
 * @description
 *  Validates this item.
 *  A item is considered valid if it follows all rules assigned
 *  as specified in it's store property schema.
 *
 *
 *  @returns:
 *    [boolean]: True if this item is valid, false if not.
 */
Item.prototype.validate = function () {
  try {
    return ValidationService.validate(this, this.__store._schema.validates);
  }
  catch (error) {
    return false;
  }
};

module.exports = Item;
