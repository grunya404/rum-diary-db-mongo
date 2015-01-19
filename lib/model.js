/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// generic model. basic CRUD operations.

const _ = require('underscore');
const StringUtils = require('string-utils');
const Promises = require('bluebird');
const mongoose = require('mongoose');
const mongooseTimestamps = require('mongoose-timestamp');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const GET_FETCH_COUNT_WARNING_THRESHOLD = 500;

const START_MESSAGE = '%(modelName)s->%(methodName)s: %(searchBy)s';
const DURATION_MESSAGE = '%(modelName)s->%(methodName)s query time: %(duration)s ms';
const SEARCH_DURATION_MESSAGE = '%(modelName)s->%(methodName)s query time for %(searchBy)s: %(duration)s ms';

function computeDuration(startTime) {
  var endTime = new Date();
  var duration = endTime.getDate() - startTime.getDate();
  return duration;
}

function logDuration(logger, startTime, args) {
  var msg = DURATION_MESSAGE;
  var formatArgs = _.extend({}, args, {
    duration: computeDuration(startTime)
  });

  if (args.searchBy) {
    formatArgs.searchBy = JSON.stringify(args.searchBy);
    msg = SEARCH_DURATION_MESSAGE;
  }

  logger.log(StringUtils.format(msg, formatArgs));
}

function logIt(self, method, args) {
  var startTime = new Date();

  args.modelName = self.name;
  var startMsg = StringUtils.format(START_MESSAGE, args);
  var logger = self._logger;

  self._logger.info(startMsg);

  return method.call(self)
    .then(function (value) {
      logDuration(logger, startTime, args);
      return value;
    }, function (err) {
      logDuration(logger, startTime, args);
      throw err;
    });
}


function withDatabase(op) {
  return function () {
    var args = [].slice.call(arguments, 0);
    var self = this;
    return this._connection.connect().then(function () {
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

/**
 * Define a model
 *
 * @method define
 * @param {String} name
 * Model name
 * @param {Object} definition
 */
exports.define = function (name, definition) {
  var Model = Object.create(module.exports);
  const schema = new Schema(definition);

  schema.plugin(mongooseTimestamps);

  Model.name = name;
  Model.Model = mongoose.model(name, schema);
  return Model;
};

/**
 * Inject dependencies into the model
 *
 * @method init
 * @param {Object} connection
 * Database connection
 * @param {Object} logger
 */
exports.init = function (connection, logger) {
  this._connection = connection;
  this._logger = logger;
};

/**
 * Create and save a model from a data item
 *
 * @method create
 * @param {Object} data
 * @returns {Object} model
 */
exports.create = function (data) {
  var model = this.createModel(data);
  return this.update(model);
};

/**
 * Save an already created model to the database. A slight misnomer for the
 * sake of understandability. Most of the time, update should only be called by
 * consumers of the API to update a model. create will call update to save the
 * initial version of the model to the database.
 * If the item is not yet converted to a model, use create instead.
 *
 * @method update
 * @param {Object} model
 */
exports.update = withDatabase(function (model) {
  if (! model.save) {
    return Promises.reject(new Error('attempting to save an item that is not a model. Try create instead.'));
  }

  return logIt(this, function () {
    var resolver = Promises.defer();

    model.save(function (err, model) {
      if (err) {
        return resolver.reject(err);
      }

      resolver.fulfill(model);
    });

    return resolver.promise;
  }, {
    methodName: 'update'
  });
});

exports.get = withDatabase(function (searchBy, fields) {
  // use a streaming get. Getting large data sets from the dB
  // uses a boatload of heap, generating your own collection
  // is much more efficient.
  var self = this;
  return this.getStream(searchBy, fields)
    .then(function (stream) {
      var resolver = Promises.defer();

      var models = [];
      stream.on('data', function (chunk) {
        models.push(chunk);
      });
      stream.on('err', function (err) {
        resolver.reject(err);
      });
      stream.on('close', function () {
        if (models.length > GET_FETCH_COUNT_WARNING_THRESHOLD) {
          self._logger.warn('Using model.get for large data sets is ' +
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

  if (!searchBy) {
    searchBy = {};
  }

  searchBy = this.getSearchBy(searchBy);

  var stream = this.Model.find(searchBy, fields).stream();
  var deferred = Promises.defer();
  stream.on('err', function (err) {
    deferred.reject(err);
  });

  stream.on('close', function () {
    deferred.resolve();
  });


  logIt(this, function () {
    return deferred.promise;
  }, {
    methodName: 'getStream',
    searchBy: searchBy
  });

  return stream;
});

exports.pipe = function (searchBy, fields, reduceStream) {
  return this.getStream(searchBy, fields)
    .then(function (stream) {
      var resolver = Promises.defer();

      stream.on('data', reduceStream.write.bind(reduceStream));

      stream.on('close', function () {
        resolver.resolve();
      });

      stream.on('err', function (err) {
        resolver.reject(err);
      });

      return resolver.promise;
    });
};

exports.calculate = withDatabase(function (reduceStream, options) {
  return this.pipe(options.filter, null, reduceStream);
});

exports.getOne = withDatabase(function (searchBy) {
  searchBy = this.getSearchBy(searchBy);

  return logIt(this, function () {
    return this.Model.findOne(searchBy).exec();
  }, {
    methodName: 'getOne',
    searchBy: searchBy
  });
});

exports.findOneAndUpdate = withDatabase(function (searchBy, update, options) {
  searchBy = this.getSearchBy(searchBy);

  return logIt(this, function () {
    return this.Model.findOneAndUpdate(searchBy, update, options).exec();
  }, {
    methodName: 'findOneAndUpdate',
    searchBy: searchBy
  });
});

exports.findOneAndDelete = withDatabase(function (searchBy) {
  searchBy = this.getSearchBy(searchBy);

  return logIt(this, function () {
    return this.Model.findOneAndRemove(searchBy).exec();
  }, {
    methodName: 'findOneAndDelete',
    searchBy: searchBy
  });
});


exports.clear = withDatabase(function () {
  this._logger.warn('clearing table: %s', this.name);
  var resolver = Promises.defer();

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


exports.createModel = function (data) {
  return new this.Model(data);
};


