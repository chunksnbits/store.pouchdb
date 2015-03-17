/* jshint node:true */
'use strict';

var _ = require('lodash');

var ExceptionHandler = require('./exception-handler');
var EventListener = require('./event-listener');

function EventHandler (collection) {

  this.collection = collection;

  this.listeners = {
    create: {},
    update: {},
    delete: {},
    change: {},
    complete: {},
    error: {}
  };

  this.supportedEvents = _.keys(this.listeners);
}

EventHandler.prototype.register = function (event, callback) {
  var registration = this.collection.pouch.changes({
    since: 'now',
    live: true
  }).on(event, callback);

  var listener = new EventListener(registration, event, callback);

  if (!_.contains(this.supportedEvents, event)) {
    return ExceptionHandler.create(
      'ShelfIllegalEventException',
      'The event you want to subscribe to is not supported. Supported events are: ' + this.supportedEvents.join(',')
    );
  }

  this.listeners[event][callback] = listener;

  return listener;
};

EventHandler.prototype.unregister = function (event, callback) {
  var self = this;

  if (event && !_.contains(this.supportedEvents, event)) {
    return ExceptionHandler.create(
      'ShelfIllegalEventException',
      'The event you want to unsubscribe from is not supported. Supported events are: ' + this.supportedEvents.join(',')
    );
  }

  if (callback) {
    this.listeners[event][callback].off();
    delete this.listeners[event][callback];
  }
  else if (event) {
    _.each(this.listeners[event], function (listener) {
      self.unregister(event, listener.callback);
    });
  }
  else {
    _.each(this.listeners, function (listeners, event) {
      self.unregister(event);
    });
  }
};

module.exports = EventHandler;
