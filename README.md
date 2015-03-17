# Introduction

pouchdb-store is a simple wrapper plugin around [PouchDB](http://pouchdb.com/api.html).

Inspired by the [Dreamcode API](http://nobackend.org/dreamcode.html) project, this plugin aims at providing a simple, but powerful offline-first solution to data handling.

# Methods

## ´´

# Usage Example

## Setup

```
var PouchDb = require('pouchdb').plugin(require('pouchdb-model'));
```

## Stores

```
var Tracks = new PouchDb('tracks').store();

var  = TrackModel.new({
  artist: 'Superfunk',
  name: 'Lollipop Heaven',
  src: './tracks/superfunk-lollipop_heaven.mp3',
  info: {
    time: 51,
    duration: 301
  }
});

trackInstance.save();
```
