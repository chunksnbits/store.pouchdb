# Introduction

pouchdb-store is a simple wrapper plugin around [PouchDB](http://pouchdb.com/api.html).

Inspired by the [Dreamcode API](http://nobackend.org/dreamcode.html) project and the Ruby on Rails [Active Record](http://guides.rubyonrails.org/active_record_basics.html) patthern, this plugin aims at providing a simple and easy to use interface for offline-first data storage.

# Installation

``` bash
npm install --save pouchdb-store
```

# Setup

To use pouchdb-store in your project you can choose between this two initialization methods:

## PouchDb plugin

The default way by using the [PouchDb plugin inteface](http://pouchdb.com/api.html#plugins) on an PouchDb database.

``` javascript
var PouchDb = require('pouchdb');

// Initialize pouchdb-store
PouchDb.plugin(require('pouchdb-store'));
// ...
var Records = new PouchDb('records').store({ /* options*/ });

Records.store({
  artist: 'Superfunk',
  title: 'Living in a Pouch'
});
```

## Standalone

Convenience method for creating a PouchDb Store without  handling any additional dependencies / creation code. This is basically equivalent to the example above, as it will internally create a new PouchDb database instance for the provided database name.

``` javascript
var PouchDbStore = require('pouchdb-store');
var Records = PouchDbStore.open('records', { /* options */ });

Records.store({
  artist: 'Superfunk',
  title: 'Living in a Pouch'
});

```

# Store

The static store interface that provides all common CRUD operations for your store.

## Store.new

Creates a new item instance. If you provide no arguments to ´new´ an empty instance will be created. Alternatively you can provide a simple object to set some initial values.

### Example (empty initialization):

``` javascript
var instance = Store.new()
instance.say = 'Hello';
```

### Example (initialization with initial values)

``` javascript
var instance = Store.new({
  say: 'Hello'
});
```

After initialization see [item](#item) interface for available methdos for storage and deletion.

## Store.store

Static persistence method. Takes one or more [items](#item) or plain objects and persists them in the PouchDb database of this store.
Will initialize a new id (which can also be provided) and rev for the item. Will return a [promise](#promises) that will provide an [item](#item) model instance for each element that has been stored.

On storage each item will be validated against the [schema](#schema) for this Store.

### Example (single value)

``` javascript
// Equivalent to MyStore.store([item])
Users.store({
  name: 'John'
}).then(function (user) {
    console.log('Hello', user.name, '(Revision:', item.rev, ')');
    // => 'Hello John (Revision: 1-ab3f6eb9554b4e240ffada8c7faf3f7f)'
  });
```

### Example (multiple values)

``` javascript
// Equivalent to MyStore.store([itemOne, itemTwo, itemThree])
Users.store(itemOne, itemTwo, itemThree)
  .then(function (users) {
    console.log(users.length);  // => 3
  });
```

After storage each item will be returned as an [item](#item) instance and can be manipulated using the [item](#item) API.

## Store.find

Static lookup method for the store API. Can used in multiple ways:

### Store.find() / Store.find('all')

Full lookup of all items in the current store. Using `find()` with no arguments and `find('all')` are equivalent.
Returns a [promise](#promises) that on resolution will provide all items currently stored in this store.

### Store.find(:id)

Looks up a single (item)[#item] by it's id. Will return a (promise)[#promises] that on resolution will return the item mapped to the id queried. The promise will be rejected if you item could be found for the given id.

``` javascript
Users.find('uid-123456')
  .then(function (user) {
    console.log('Hooray, found user' + user.name);
  })
  .catch(function (error) {
    console.log('Oh no, the user is no longer available in this store.');
  });
```

### Store.find({ :query })

Looks up all [items](#item) in the current store that match the given query object. The query can also be nested and will be evaluated recursively.

``` javascript
Users.find({ name: 'John' })
  .then(function (users) {
    console.log('Found', users.length, 'in this store');
  });
```

## Store.remove

Static removal method. Will remove one or more items provided to the method call. Will return a promise, that will either be resolved, if the item could be deleted or fail in case e.g., the item was not found in the store.

``` javascript
Records.remove(record)
  .then(function() {
    console.log('The record was successfully removed')M
  });
```

## Store.empty

Static removal method. Will remove all items persisted in the current store. Will return a promise, that will be resolved after all items have been deleted from the store.

``` javascript
Records.empty()
  .then(function() {
    console.log('The record was successfully removed')M
  });
```

# Items

## item.save

## item.delete

# Schema

## Store.hasMany

## Store.hasOne

## Store.properties

# Events

## Store.on

## Store.off

## listener.cancel
