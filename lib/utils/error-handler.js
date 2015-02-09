/* jshint node:true */
'use strict';

function ShelfInitializationException(message, info) {
  this.message = message + JSON.stringify(info, null, 2);
  this.name = 'ShelfDocumentUpdateConflict';
  this.info = info;
}

ShelfInitializationException.prototype = Error.prototype;

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
      case 'ShelfDocumentNotFoundConflict':
        return new ShelfDocumentNotFoundConflict(message, info);
      case 'ShelfInitializationException':
        return new ShelfInitializationException(message, info);
    }

    return new ShelfGenericErrorException(message, info);
  }
};