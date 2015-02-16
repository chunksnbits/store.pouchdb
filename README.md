# Introduction

pouchdb-collections is a simple wrapper interface around the popular [PouchDB](http://pouchdb.com/api.html) API.

Inspired by the [Dreamcode API](http://nobackend.org/dreamcode.html), this library aims at providing a simple, but powerful offline-first solution to data handling.

There is actually no functionality added, that cannot be achieved by using the original framework. But using it, may hopefully come a little bit more natural to you.

# Methods

## ´´

# Usage Example

ShelfDB.load('tracks', {
  // options
});

```
{
  //
  // Sync: Client
  //
  sync: boolean,              // default: true
  server: string || {         // default: 'http://localhost:9821/shelf'
    path: string,             // default: 'localhost'
    port: int,                // default: 9221
    root: string              // default: '/shelfdb'
  },

  authentification: boolean,  // default: true

  //
  // Adapters: Client + Node
  //
  adapter: Object,            // default: will infer by looking up installed modules
                              // fallback: pouchdb

  db: [Object] || {           // default: will infer by looking up installed modules
                              // note: Depends on the kind of adapter you are using
                              // fallback: memory + filesystem
    root: './.db'
  }

  //
  // Other: Client + Node
  //
  debug: boolean              // default: false
}
```