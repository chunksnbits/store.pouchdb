/* jshint node:true */
'use strict';

module.exports = function (method, type, message, error) {
  return {
    type: type,
    method: method,
    message: message,
    _original: error
  };
};