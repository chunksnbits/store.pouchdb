/* jshint node:true */
'use strict';

function ShelfDocumentUpdateConflict (message, info) {
  this.message = message + JSON.stringify(info, null, 2);
  this.name = 'ShelfDocumentUpdateConflict';
}
ShelfDocumentUpdateConflict.prototype = Error.prototype;

function ShelfDocumentNotFoundConflict (message, info) {
  this.message = message + JSON.stringify(info, null, 2);
  this.name = 'ShelfDocumentNotFoundConflict';
}

ShelfDocumentNotFoundConflict.prototype = Error.prototype;

function ShelfGenericErrorException (message, info) {
  this.message = message + JSON.stringify(info, null, 2);
  this.name = 'ShelfGenericErrorException';
}

ShelfGenericErrorException.prototype = Error.prototype;


module.exports = {
  create: function (type, message, error) {

    var info = {
      type: type,
      message: message,
      _original: error
    };

    switch (type) {
      case 'ShelfDocumentUpdateConflict':
        return new ShelfDocumentUpdateConflict(message, info);
      case 'ShelfDocumentNotFoundConflict':
        return new ShelfDocumentNotFoundConflict(message, info);
    }

    return new ShelfGenericErrorException(message, info);
  }
};