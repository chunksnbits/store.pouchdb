/* jshint node:true */
'use strict';

function ShelfInitializationException(message, info) {
  this.message = message + JSON.stringify(info, null, 2);
  this.name = 'ShelfInitializationException';
  this.info = info;
}

ShelfInitializationException.prototype = Error.prototype;

function ShelfProtectedPropertyException (message, info) {
  this.message = message + JSON.stringify(info, null, 2);
  this.name = 'ShelfProtectedPropertyException';
  this.info = info;
}

ShelfProtectedPropertyException.prototype = Error.prototype;

function ShelfDocumentUpdateConflict (message, info) {
  this.message = message + JSON.stringify(info, null, 2);
  this.name = 'ShelfDocumentUpdateConflict';
  this.info = info;
}

ShelfDocumentUpdateConflict.prototype = Error.prototype;

function ShelfDocumentNotFoundConflict (message, info) {
  this.message = message + JSON.stringify(info, null, 2);
  this.name = 'ShelfDocumentNotFoundConflict';
  this.info = info;
}

ShelfDocumentNotFoundConflict.prototype = Error.prototype;

function ShelfGenericErrorException (message, info) {
  this.message = message + JSON.stringify(info, null, 2);
  this.name = 'ShelfGenericErrorException';
  this.info = info;
}

ShelfGenericErrorException.prototype = Error.prototype;

function ShelfIllegalEventException (message, info) {
  this.message = message + JSON.stringify(info, null, 2);
  this.name = 'ShelfIllegalEventException';
  this.info = info;
}

ShelfIllegalEventException.prototype = Error.prototype;

function ShelfInvalidValidationException(message, info) {
  this.message = message + JSON.stringify(info, null, 2);
  this.name = 'ShelfInvalidValidationException';
  this.info = info;
}

ShelfInitializationException.prototype = Error.prototype;

module.exports = {
  create: function (type, message, error) {
    //
    // Allows definition by argument or in a single
    // definition object in the form of
    //
    // { type: '', message: '', error: {} }
    //
    var info = {
      type: type || arguments[0].type,
      message: message || arguments[0].message,
      _original: error || arguments[0].error
    };

    switch (type) {
      case 'ShelfDocumentUpdateConflict':
        return new ShelfDocumentUpdateConflict(message, info);
      case 'ShelfInitializationException':
        return new ShelfInitializationException(message, info);
      case 'ShelfProtectedPropertyException':
        return new ShelfProtectedPropertyException(message, info);
      case 'ShelfDocumentNotFoundConflict':
        return new ShelfDocumentNotFoundConflict(message, info);
      case 'ShelfInitializationException':
        return new ShelfInitializationException(message, info);
      case 'ShelfIllegalEventException':
        return new ShelfIllegalEventException(message, info);
      case 'ShelfInvalidValidationException':
        return new ShelfInvalidValidationException(message, info);
    }

    return new ShelfGenericErrorException(message, info);
  }
};
