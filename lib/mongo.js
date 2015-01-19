/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * The MongoDB adapter
 * @module MongoDB
 */

const _ = require('underscore');
const Promises = require('bluebird');

const NullLogger = require('./loggers/null');
const MongoConnection = require('./mongo-connection');

const Models = require('./models');

/**
 * The MongoDB adapter
 * @class MongoDB
 */
var MongoDB = _.extend(Object.create(Models.Models), {
  /**
   * Initialize the adapter
   * @method init
   * @param {Object} config
   * Database configuration
   * @param {Object} [logger]
   */
  init: function (config, logger) {
    logger = logger || NullLogger;
    var connection = Object.create(MongoConnection);
    connection.init(config, logger);
    Models.invokeMethod('init', connection, logger);
  },

  /**
   * Clear the database
   * @method clear
   * @param {Function} [done]
   * Function to call when complete.
   * @returns {Object} promise
   */
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
