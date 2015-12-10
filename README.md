Store.PouchDb is a simple interface wrapper plugin around [PouchDB](http://pouchdb.com/api.html) offline first database.

Inspired by the [Dreamcode API](http://nobackend.org/dreamcode.html) project and object relational mappers like the Ruby on Rails [Active Record](http://guides.rubyonrails.org/active_record_basics.html) pattern this project aims to provide a simple interface to access often used request methods like `store` and `find` as well as providing helpers to allow relationship mapping between multiple databases.

# Installation

``` bash
npm install --save store.pouchdb
```

# Setup

Setup Store.PouchDb using the [PouchDb plugin](http://pouchdb.com/api.html#plugins) notation:

``` javascript
var PouchDb = require('pouchdb').plugin(require('store.pouchdb'));
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

* [Store](#store)
  * [Store.store(:object [,...])](#store-store)
  * [Store.find(:id)](#store-find-id)
  * [Store.find(:query)](#store-find-query)
  * [Store.find()](#store-find-all)
  * [Store.remove(:item [,...])](#store-remove-item)
  * [Store.remove()](#store-remove-all)
* [Syncronization](#store-sync)
  * [Store.sync(:name [,:options])](#store-sync)
* [Item](#item)
  * [Store.new()](#store-new)
  * [item.store()](#item-store)
  * [item.remove()](#item-remove)
  * [item.$info](#item-info)
  * [item.rev](#item-rev)
* [Properties](#properties)
  * [Store.hasMany(:property [,:store])](#properties-has-many)
  * [Store.hasOne(:property [,:store])](#properties-has-one)
  * [Store.validates(:property, :validation)](#properties-validates)
  * [Store.schema(:schema)](#properties-schema)
* [Events](#events)
  * [Store.on(:event, :callback)](#store-on)
  * [listener.off()](#listener-off)


# Store<a name="store"></a>

## Store.store(:item [,...])<a name="store-store"></a>

Basic persistence methods for the store. Takes one or more [items](#item) or plain objects and creates or updates them in the database of this store.

* Initializes a new id (optional, can also be set manually) and [revision](#item.rev) when called initially on an item or object
* Returns a [promise](#promises) that on resolution returns the updated [item](#item) instance(s).
* On storage each item will be validated against the [schema](#schema) of this Store.
* Will recursively store all one-to-one / one-to-many [associations](#properties.has-many) defined for this store.
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

## Store.find(:id)<a name="store-find-id"></a>

Looks up a single [item](#item) by it's id.

* Returns a [promise](#promises) that on resolution will return the item for the requested id.
* The promise will be rejected if you item could be found for the given id.

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

## Store.find(:query)<a name="store-find-query"></a>

Looks up all [items](#item) that match the given query object.

* Returns a [promise](#promises) that on resolution will return an array with all items that matched the query.
* Returns an empty array if no items could be found.
* The query can be nested and will be evaluated recursively

### Example

``` javascript
Users.find({ name: 'John' })
  .then(function (users) {
    console.log('Found', users.length, 'by the name of "John" in this store');
  });
```

### Store.find()<a name="store-find-all"></a>

Looks up all [items](#item) currently kept in the store.

* Returns a [promise](#promises) that on resolution will provide all items currently stored in this store.
* Returns an empty array if the store is empty.

### Example

``` javascript
Users.find()
  .then(function (users) {
    console.log('There are currently', users.length, 'in the users store');
  });
```

## Store.remove(:item)<a name="store-remove-item"></a>

Removes the given [item](#item) from the store.

* Returns a promise that will be resolved once the item has successfully been removed from the store.

### Example

``` javascript
Records.remove(record)
  .then(function() {
    console.log('The record was successfully removed')M
  });
```

## Store.remove()<a name="store-remove-all"></a>

Removes all [items](#item) from the store.

* Returns a promise that will be resolved once all items have successfully been removed from the store.

### Example

``` javascript
Records.remove()
  .then(function() {
    console.log('All items have been successfully removed from this store')M
  });
```

# Synchronization<a name="store-sync"></a>

## Store.sync(:store [,:options])

Sets up (live) synchronization between multiple stores.

* Equivalent to [PouchDB Sync](http://pouchdb.com/api.html#sync)
* By default will set those PouchDb options: `{ live: true, retry: true }`
* See [events](#events) for listening to either of the synchronized stores

### Example

``` javascript
var Tracks = new PouchDb('tracks').store();

// Will setup synchronization with a remote pouch
Tracks.sync('http://138.231.22.16:9073/pouch/tracks');
```

# Items<a name="item"></a>

## Store.new([:data])<a name="store-new"></a>

Creates a new item instance.

* The instance will not have been persisted at this point, i.e., it will not have been assigned it's id and initial [revions](#item.rev) yet
* If the optional data object is provided the item will be initialized with the values provided.

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

## item.store()<a name="item-store"></a>

Stores the item in the [store](#store) used for the creation of this item.

* If not previously stored, creates a new id (which can also be provided) and rev for the item.
* Updates the item on each subsequent call.
* Returns a [promise](#promises) that on resolution will return the updated item
* Will be validated against the [schema](#store.schema) of this Store.
* Will not update the item if none of the attributes have been changed (i.e., deep-equals is true).
* Will recursively store all one-to-one / one-to-many [associations](#properties.has-many) defined for this store.
* This method is the instance equivalent to `Store.store(item);`

### Example

``` javascript
var john = Users.new(/* properties */);

john.store()
  .then(function () {
    console.log('Item successfully stored');
  });
```

## item.remove()<a name="item-remove"></a>

Removes the item from the [store](#store) used for the creation of this item.

* Returns a promise that will be resolved once the item has been successfully deleted.
* This method is the instance equivalent to `Store.remove(item);`

### Example

``` javascript
var john = Users.new(/* properties */);

// ... do magic
john.remove();
```

# item.$info<a name="item-info"></a>

Each item will automatically be extended by the following fields:

* `$info.createdAt` - The time of creation for this item
* `$info.updatedAt` - The last time this item has been updated.
* `$info.store` - The name of the store that holds this item.

# item.rev<a name="item-rev"></a>

Each store operation will update an items revision (`rev`).

* A revision indicates a specific version of an item.
* By default Store.PouchDb will keep all revisions of an item
* Refer to the [PouchDb API](http://pouchdb.com/api.html) for further details on revision handling

# Properties<a name="properties"></a>

There are two kind of properties that can be defined on a store.

Associations define the relationship between items of two associated stores. Associations can be defined as either one-to-one or one-to-many relations.

* Associated items are stored as separate entities in the store specified by the relation.
* Associated items are stored autimatically when the parent item is stored.
* Associated items are loaded automaticaly when loading the parent item.
* Associated items can be stored / queried independently from their parent.

Validations allow to restrict the charasteristics of certain properties within the item model to be stored.

## Store.hasMany(:property [,:store])<a name="properties-has-many"></a>

Defines a one-to-many association to the store.

* Provide a store argument if the name of the property and the name of the store do not match.
* The store argument can be be either as string with the name of the store or [store](#store) instance.
* If you want to nest associations deeper than one level you must provide each store argument as a [store](#store) instance

This association is especially helpful if you either need to handle the association items independent from each other, e.g., in different modules, or will (often) update the content of the associated items independently from each other.

### Example

Consider a data-model for one playlist that contains many tracks, with the tracks updated often, e.g., updating their playback state.
Using a nested approach would cause an update, i.e., a new [revision](#revisions), of the playlist whenever any of the associated tracks are updated. Using the hasMany association you can update the track without updating the playlist, while still keeping easy access to the nesting of.

``` javascript
Playlists.hasMany('tracks');

var playlist = Playlist.find('my-playlist');
playlist.tracks[0].played++;
playlist.store();  // Updates the first track, but causes no new revision for the playlist
```

## Store.hasOne(:property [,:store])<a name="properties-has-one"></a>

Defines a one-to-one relation for the store.

* Provide a store argument if the name of the property and the name of the store do not match.
* The store argument can be be either as string with the name of the store or [store](#store) instance.
* If you want to nest associations deeper than one level you must provide each store argument as a [store](#store) instance

Use the hasOne relation to keep the associated items as separate entities, that can be loaded independently from each other, e.g., for usage in different modules.

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

## Store.validates(:property, :validation)<a name="properties-validates"></a>

Allows to restrict the type and characterisitics that certain properties of an item must apply to, before they can be stored in the associated store. The following validations are available:

* Takes either a string argument indicating the type of the property or an object defining at least one of:
  * type: Expects a `string`. Allows to specify the type of the property. Possible values are:
    * `string`
    * `number`
    * `boolean`
    * `date`
    * `object`
    * `array`
  * required: Expects a `boolean`. Flags the property to be obligatory for storing this item.
  * validate: Expects a `function`. Allows to give a function that is executed for the property whenever this item is stored.

### Example

``` javascript
var Tracks = new PouchDb('tracks').store();

// Ensures the type of the 'length' property
Tracks.validates('length', 'number');

// Ensures 'url' is provided
Tracks.validates('url', {
  type: 'string',
  required: true
});

// Ensures 'artist' has a non-empty name
Tracks.validates('artist', {
  type: 'object',
  validate: function (artist, track) {
    return artist.name && artist.name.length;
  }
});
```

## Store.schema(:schema)<a name="properties-schema"></a>

Convenience method to apply multiple association and validation specifications in a single call.

### Example

``` javascript
MyStore.schema({
  hasOne: [{
    artist: 'artists'
  }],
  hasMany: ['comments', 'likes'],
  validates: [{
    length: 'number',
    artist: {
      type: 'object',
      validate: /* function */
    }
  }];
});
```

# Events<a name="events"></a>

Events provide a method to listen to changes made to the store

## Store.on(:event, :callback)<a name="store-on"></a>

Subscribes to the event provided, causing the callback to be called whenever the event is recorded on any store item.
Returns a listener object that allows to keep track of the subscription and [cancel](listener.cancel) it if no longer needed.

### Example

``` javascript
var listener = MyStore.on('update', function () {
  /* the magic happens here */
});
```

## listener.off()<a name="listener-off"></a>

Applies to the listener object returned by the [on](#store.on) function.
The listener allows you to keep track of the subscription and provides an alternative way to cancel the listener if no longer needed.

``` javascript
var listener = MyStore.on('update', function () {/* the magic happens here */});
listener.off();
```

# Promises<a name="promises"></a>

Store.PouchDb uses the [bluebird promise library](https://github.com/petkaantonov/bluebird). For further details on available methods see the [API documentation](https://github.com/petkaantonov/bluebird/blob/master/API.md).

The most commonly used methods are:

* [promise.then(:callback)](https://github.com/petkaantonov/bluebird/blob/master/API.md#thenfunction-fulfilledhandler--function-rejectedhandler----promise) - Executes the given callback function once the promise has been fulfilled.
* [promise.catch(:callback)](https://github.com/petkaantonov/bluebird/blob/master/API.md#catchfunction-handler---promise) - Executes the given callback function if the promise gets rejected, e.g., because of a conflict or exception.
* [promise.map(:callback)](https://github.com/petkaantonov/bluebird/blob/master/API.md#mapfunction-mapper--object-options---promise) - Executes the given map-function on each item of the promise previous result and returns the manipulated result set.
* [promise.reduce(:callback)](https://github.com/petkaantonov/bluebird/blob/master/API.md#reducefunction-reducer--dynamic-initialvalue---promise) - Executes the given reduce-function on each item of the previous promise result and returns a single result.
* [promise.filter(:callback)](https://github.com/petkaantonov/bluebird/blob/master/API.md#filterfunction-filterer--object-options---promise) - Executes the given filter-function on each item of the previous promise result and allows to filter items on the criteria defined in the callback function.

# Contributions

Contributions are very welcome, both as pull requests or just in the form of discussion.

# Roadmap / Open Topics

* Clean up library structure - extract pouch adapter into separate repository and decouple store from PouchDb specific implementation
* Improve performance, especially on find operations (see [PouchDb guide on using views](http://pouchdb.com/guides/queries.html))
* Clean up and improve test cases
* Finalize API
