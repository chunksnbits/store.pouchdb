/* jshint node:true */
'use strict';

function EventListener (pointer, event, callback) {
  this.pointer = pointer;
  this.event = event;
  this.callback = callback;
}

EventListener.prototype.off = function () {
  this.pointer.cancel();
};

module.exports = EventListener;