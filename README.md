# Introduction

Store-PouchDb is a simple interface wrapper around [PouchDB](http://pouchdb.com/api.html) offline first database.

Inspired by the [Dreamcode API](http://nobackend.org/dreamcode.html) project and the Ruby on Rails [Active Record](http://guides.rubyonrails.org/active_record_basics.html) pattern this project aims to provide a simple interface to access often used request methods like `store` and `find` as well as providing helpers to allow relationship mapping between multiple databases.

# Installation

``` bash
npm install --save store-pouchdb
```

# Setup

Setup Store-PouchDb using the [PouchDb plugin](http://pouchdb.com/api.html#plugins) notation:

``` javascript
var PouchDb = require('pouchdb').plugin(require('pouchdb-store'));
```

After this you can create new stores from any [PouchDb database](http://pouchdb.com/api.html#create_database) using the `store()` method on the database object:

``` javascript
var Records = new PouchDb('records').store({ /* options*/ });

Records.store({
  artist: 'Pouchfunk',
  title: 'Living in a Pouch'
});
```

# API

* Store
  * Store.store(new)
  * Store.store(item, [...])
  * Store.find(id)
  * Store.find(query)
  * Store.find()
  * Store.remove(item, [...])
  * Store.empty()  
* Syncronization
  * Store.sync(name, options)
* Item
  * Store.new()
  * item.store()
  * item.remove()
  * Metadata
* Associations
  * Store.hasMany(name, [store])
  * Store.hasOne(name, [store])
* Validations
  * Store.property(name, validations)
* Events
  * Store.on(event, callback)
  * Store.off(event, callback)
  * listener.cancel()
* Creation
  * PouchDb.store(options)


# Store

## Store.store(:object [,...])

Basic persistence methods for the store. Takes one or more [items](#Items) or plain objects and creates or updates them in the database of this store.

* Initializes a new id (optional, can also be set manually) and [revision](#Revisions) when called initially on an item or object
* Returns a [promise](#promises) that on resolution returns the updated [item](#Items) instance(s).
* On storage each item will be validated against the [schema](#schema) of this Store.
* Will recursively store all one-to-one / one-to-many [associations](#Associations) defined for this store.
* Will not update the item if none of the attributes have been changed (i.e., deep-equals is true).

### Example (Single)

``` javascript
Users.store({ name: 'John' })
  .then(/* handle response */);
```

### Example (Multiple)

``` javascript
var john = Users.new({ name: 'John' });
var jane = Users.new({ name: 'Jane' });

Users.store(john, jane)
  .then(/* handle response */);
```

### Example (Update)

``` javascript
var john = Store.find(/* john's id */);

john.phone = '+12345678';

Users.store(john)
  .then(/* handle response */);
```

## Store.find(:id)

Looks up a single [item](#Items) by it's id. Will return a [promise](#promises) that on resolution will return the item for the requested id.
The promise will be rejected if you item could be found for the given id.

### Example

``` javascript
Users.find('uid-123456')
  .then(function (user) {
    console.log('Hooray, found user' + user.name);
  })
  .catch(function (error) {
    console.log('Oh no, the user is no longer available in this store.');
  });
```

## Store.find(:query)

Looks up all [items](#Items) that match the given query object. Will return a [promise](#Promises) that on resolution will return an array with all items that matched the query. Will return an empty array if no items could be found.

* The query can be nested and will be evaluated recursively

### Example

``` javascript
Users.find({ name: 'John' })
  .then(function (users) {
    console.log('Found', users.length, 'by the name of "John" in this store');
  });
```

### Store.find()

Looks up all [itens](#Items) currently kept in the store. Will return a [promise](#promises) that on resolution will provide all items currently stored in this store or an empty array if the store is empty.

### Example

``` javascript
Users.find()
  .then(function (users) {
    console.log('There are currently', users.length, 'in the users store');
  });
```

## Store.remove(:item)

Removes the given [item](#Items) from the store. Will return a promise that will be resolved once the item has successfully been removed from the store.

### Example

``` javascript
Records.remove(record)
  .then(function() {
    console.log('The record was successfully removed')M
  });
```

## Store.empty()

Removes all [items](#Items) from the store. Will return a promise that will be resolved once all items have successfully been removed from the store.

### Example

``` javascript
Records.empty()
  .then(function() {
    console.log('The record was successfully removed')M
  });
```

# Synchronization

## Store.sync(:store [, options])

Sets up (live) synchronization between multiple stores.

* Equivalent to [PouchDB Sync](http://pouchdb.com/api.html#sync)
* By default will set those PouchDb options: `{ live: true, retry: true }`
* See [events](#Events) for listening to either of the synchronized stores

### Example

``` javascript
var Tracks = new PouchDb('tracks').store();

// Will setup synchronization with a remote pouch
Tracks.sync('http://138.231.22.16:9073/pouch/tracks');
```

# Items

## Store.new([:object])

Creates a new item instance. If the optional data object is provided the item will be initialized with the values provided.

### Example

``` javascript
// Creates a new empty item instance
var john = Users.new();
john.name = 'John';
john.store();

// Creates a new item instance with intial values
var jane = Users.new({ name: 'Jane' });
jane.store();
```

## item.store()

Stores the item in the [store](#store) used for the creation of this item.
If not previously stored, creates a new id (which can also be provided) and rev for the item.
Updates the item on each subsequent call.

Returns a [promise](#promises) that on resolution will return the item, updated with a new id (on first store) and id (increases with each subsequent update).

* Will be validated against the [schema](#schema) of this Store.
* Will not update the item if none of the attributes have been changed (i.e., deep-equals is true).
* Will recursively store all one-to-one / one-to-many [associations](#Associations) defined for this store.
* This method is the instance equivalent to `Store.store(item);`

### Example

``` javascript
var john = Users.new(/* properties */);

john.save()
  .then(function () {
    console.log('Item successfully stored');
  });
```

## item.remove()

Removes the item from the [store](#store) used for the creation of this item.
Returns a promise that will be resolved once the item has been successfully deleted.

* This method is the instance equivalent to `Store.remove(item);`

### Example

``` javascript
var john = Users.new(/* properties */);

// ... do magic

john.remove();
```

# Metadata

Each item will automatically be extended by the following fields:

TODO...

# Associations

Associations can be defined as either one-to-one or one-to-many relations between two or more stores.

* Associated items are stored as separate entities in the store specified by the relation.
* Associated items are stored autimatically when the parent item is stored.
* Associated items are loaded automaticaly when loading the parent item.
* Associated items can be stored / queried independently from their parent.

## Store.hasMany(:name [, :store])

Defines a one-to-many association to the store.
This association is especially helpful if you either need to handle the association items independent from each other, e.g., in different modules, or will (often) update the content of the associated items independently from each other.

* Provide a store argument if the name of the property and the name of the store do not match.
* The store argument can be be either as string with the name of the store or [store](#Store) instance.
* If you want to nest associations deeper than one level you must provide each store argument as a [store](#Store) instance

### Example

Consider a data-model for one playlist that contains many tracks, with the tracks updated often, e.g., updating their playback state.
Using a nested approach would cause an update, i.e., a new [revision](#Revisions), of the playlist whenever any of the associated tracks are updated. Using the hasMany association you can update the track without updating the playlist, while still keeping easy access to the nesting of.

``` javascript
Playlists.hasMany('tracks');

var playlist = Playlist.find('my-playlist');
playlist.tracks[0].played++;
playlist.store();  // Updates the first track, but causes no new revision for the playlist
```

## Store.hasOne

Defines a one-to-one relation for the store.
Use the hasOne relation to keep the associated items as separate entities, that can be loaded independently from each other, e.g., for usage in different modules.

* Provide a store argument if the name of the property and the name of the store do not match.
* The store argument can be be either as string with the name of the store or [store](#Store) instance.
* If you want to nest associations deeper than one level you must provide each store argument as a [store](#Store) instance

### Example

Consider a data-model for one track that is associated with one artist. Loading the track in the media-player view you'd also like to display the artist information for the track, while on the artist's profile view you need to display the artist information regardles of a specific track.

``` javascript
// Player controller
Tracks.hasOne(artist);

var track = Tracks.find('pouchfunk--living-in-a-pouch');
var artist = Artists.find('pouchfunk');

assert(track.artist.id === artist.id);    // true
assert(track.artist.name === artist.name);    // true
```

# Validations

## Store.properties

Allows to restrict the properties to be considered for persistence and apply validation rules that values for this properties must match.
The following validations are available:

* type (string): Allows to specify the type of the property. Possible values are: `string`, `number`, `boolean`, `date`, `object` or `array`
* required (boolean): Flags the property to be obligatory for storing the item.
* validate (function): Allows to give a function that is executed for the property whenever the item is stored.

### Example

``` javascript
var Tracks = new PouchDb('tracks').store();

// Ensures the type of the 'length' property
Tracks.property('length', 'number');

// Ensures 'url' is provided
Tracks.property('url', {
  type: 'string',
  required: true
});

// Ensures 'artist' has a non-empty name
Tracks.property('artist', {
  type: 'object',
  validate: function (artist, track) {
    return artist.name && artist.name.length;
  }
});
```

## Store.schema

Convenience method to apply multiple association and property specifications in a single call.

### Example

``` javascript
MyStore.schema({
  hasOne: [{
    artist: 'artists'
  }],
  hasMany: ['comments', 'likes'],
  properties: [{
    length: 'number',
    artist: {
      type: 'object',
      validate: /* function */
    }
  }];
});
```

# Events

Events provide a method to listen to changes made to the store

## Store.on(:event, :callback)

Subscribes to the event provided, causing the callback to be called whenever the event is recorded on any store item.
Returns a listener object that allows to keep track of the subscription and [cancel](listener.cancel()) it if no longer needed.

### Example

``` javascript
var listener = MyStore.on('update', function () {
  /* the magic happens here */
});
```

## listener.off()

Applies to the listener object returned by the [on](#Store.on(:event [,:callback])) function.
The listener allows to keep track of the subscription and provides an alternative way to cancel the listener if no longer needed.

``` javascript
var listener = MyStore.on('update', function () {/* the magic happens here */});
listener.off();
```
