/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// generic model. basic CRUD operations.

const Promise = require('bluebird');
const mongoose = require('mongoose');
const mongooseTimestamps = require('mongoose-timestamp');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const reduce = require('../../lib/reduce');
const logger = require('../../lib/logger');
const connection = require('../mongo-connection');


const GET_FETCH_COUNT_WARNING_THRESHOLD = 500;



exports.init = function (name, definition) {
  const schema = new Schema(definition);

  schema.plugin(mongooseTimestamps);

  this.name = name;
  this.Model = mongoose.model(name, schema);
};

/**
 * Create and save a model from a data item
 */
exports.create = function (item) {
  var model = this.createModel(item);
  return this.update(model);
};

/**
 * save an already created model to the database. A slight misnomer for the
 * sake of understandability. Most of the time, update should only be called by
 * consumers of the API to update a model. create will call update to save the
 * initial version of the model to the database.
 * If the item is not yet converted to a model, use create instead.
 */
exports.update = withDatabase(function (model) {
  var resolver = Promise.defer();

  if (! model.save) {
    return resolver.reject('attempting to save an item that is not a model. Try create instead.');
  }

  var startTime = new Date();
  var self = this;
  model.save(function(err, model) {
    var endTime = new Date();
    var duration = endTime - startTime;
    logger.info('%s->update: %s ms', self.name, duration);

    if (err) {
      return resolver.reject(err);
    }

    resolver.fulfill(model);
  });

  return resolver.promise;
});

exports.get = withDatabase(function (searchBy, fields) {
  // use a streaming get. Getting large data sets from the dB
  // uses a boatload of heap, generating your own collection
  // is much more efficient.
  return this.getStream(searchBy, fields)
             .then(function (stream) {
                var resolver = Promise.defer();

                var models = [];
                stream.on('data', function (chunk) {
                  models.push(chunk);
                });
                stream.on('err', function(err) {
                  resolver.reject(err);
                });
                stream.on('close', function () {
                  if (models.length > GET_FETCH_COUNT_WARNING_THRESHOLD) {
                    logger.warn('Using model.get for large data sets is ' +
                                'heap inefficient. Use getStream instead.');
                  }
                  resolver.fulfill(models);
                });

               return resolver.promise;
             });
});

exports.getStream = withDatabase(function (searchBy, fields) {
  if ( ! fields && typeof searchBy === 'string') {
    fields = searchBy;
    searchBy = {};
  }

  if (!searchBy) searchBy = {};

  var startTime = new Date();
  var name = this.name;

  searchBy = this.getSearchBy(searchBy);

  logger.info('%s->getStream: %s', name, JSON.stringify(searchBy));

  var stream = this.Model.find(searchBy, fields).stream();

  stream.on('err', function(err) {
    computeDuration();
    logger.error('%s->getStream error: %s', name, String(err));
  });

  stream.on('close', computeDuration);

  return stream;

  function computeDuration() {
    var endTime = new Date();
    var duration = endTime.getDate() - startTime.getDate();
    logger.info('%s->get query time for %s: %s ms',
                    name, JSON.stringify(searchBy), duration);
  }
});

exports.pipe = function(searchBy, fields, reduceStream) {
  return this.getStream(searchBy, fields)
              .then(function(stream) {
                var resolver = Promise.defer();

                stream.on('data', reduceStream.write.bind(reduceStream));

                stream.on('close', function () {
                  resolver.resolve(reduceStream.result());
                });

                stream.on('err', function (err) {
                  resolver.reject(err);
                });

                return resolver.promise;
              });
};

function getWhich(options) {
  return Object.keys(options).filter(function(name) { return name !== 'filter'; });
}

exports.calculate = withDatabase(function (options) {
  options.which = getWhich(options);
  // Use a stream instead of one large get for memory efficiency.
  var stream = new reduce.StreamReduce(options);

  // XXX Maybe this should live outside of here.
  return this.pipe(options.filter, null, stream)
                .then(function(results) {
                  stream.end();
                  stream = null;
                  return results;
                }, function (err) {
                  stream.end();
                  stream = null;
                  throw err;
                });
});

exports.getOne = withDatabase(function (searchBy) {
  var startTime = new Date();
  var name = this.name;

  searchBy = this.getSearchBy(searchBy);

  logger.info('%s->getOne: %s', name, JSON.stringify(searchBy));
  return this.Model.findOne(searchBy).exec().then(function(model) {
    computeDuration();
    return model;
  })
  .then(null, function(err) {
    computeDuration();
    logger.error('%s->getOne error: %s', name, String(err));
    throw err;
  });

  function computeDuration() {
    var endTime = new Date();
    var duration = endTime.getDate() - startTime.getDate();
    logger.info('%s->getOne query time for %s: %s ms',
                    name, JSON.stringify(searchBy), duration);
  }
});

exports.findOneAndUpdate = withDatabase(function (searchBy, update, options) {
  var startTime = new Date();
  var name = this.name;

  searchBy = this.getSearchBy(searchBy);

  logger.info('%s->findOneAndUpdate: %s', name, JSON.stringify(searchBy));
  return this.Model.findOneAndUpdate(searchBy, update, options).exec().then(function(model) {
    computeDuration();
    return model;
  })
  .then(null, function(err) {
    computeDuration();
    logger.error('%s->findOneAndUpdate error: %s', name, String(err));
    throw err;
  });

  function computeDuration() {
    var endTime = new Date();
    var duration = endTime.getDate() - startTime.getDate();
    logger.info('%s->findOneAndUpdate query time for %s: %s ms',
                    name, JSON.stringify(searchBy), duration);
  }
});

exports.findOneAndDelete = withDatabase(function(searchBy) {
  searchBy = this.getSearchBy(searchBy);

  return this.Model.findOneAndRemove(searchBy).exec();
});


exports.clear = withDatabase(function () {
  logger.warn('clearing table: %s', this.name);
  var resolver = Promise.defer();

  this.Model.remove(function (err) {
    if (err) {
      return resolver.reject(err);
    }

    resolver.fulfill();
  });

  return resolver.promise;
});

exports.getSearchBy = function (searchBy) {
  var query = {};

  for (var key in searchBy) {
    // mongo does not have a createdAt, instead the id contains a timestamp.
    // convert createdAt to the timestamp.
    if (key === 'start') {
      query._id = query._id || {};
      query._id.$gte = timestampToObjectId(searchBy.start.toDate());
    } else if (key === 'end') {
      query._id = query._id || {};
      query._id.$lte = timestampToObjectId(searchBy.end.toDate());
    } else {
      query[key] = searchBy[key];
    }
  }

  return query;
};


exports.createModel = function(data) {
  return new this.Model(data);
};


function withDatabase(op) {
  return function () {
    var args = [].slice.call(arguments, 0);
    var self = this;
    return connection.connect().then(function() {
      return op.apply(self, args);
    });
  };
}

// Return an ObjectId embedded with a given timestamp
function timestampToObjectId(timestamp) {
  // Convert date object to hex seconds since Unix epoch
  var hexSeconds = Math.floor(timestamp.getTime() / 1000).toString(16);

  // Create an ObjectId with that hex timestamp
  var objectId = new ObjectId(hexSeconds + '0000000000000000');

  return objectId;
}


