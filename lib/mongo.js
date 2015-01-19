/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const _ = require('underscore');
const Promises = require('bluebird');

const NullLogger = require('./loggers/null');
const MongoConnection = require('./mongo-connection');

const Models = require('./models');

var MongoDB = _.extend(Object.create(Models.Models), {
  init: function (config, logger) {
    logger = logger || NullLogger;
    var connection = Object.create(MongoConnection);
    connection.init(config, logger);
    Models.invokeMethod('init', connection, logger);
  },

  clear: function (done) {
    return Promises.all(Models.invokeMethod('clear'))
      .then(function() {
        if (done) {
          done(null);
        }
      });
  }
});

module.exports = MongoDB;
