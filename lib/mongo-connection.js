/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


/**
 * Handle connections to the database
 *
 * @module RumDiaryMongoDB
 */

const Promises = require('bluebird');
const mongoose = require('mongoose');

/**
 * Initialize
 * @method init
 * @param {Object} config
 * @param {Object} logger
 */
exports.init = function (config, logger) {
  this._config = config;
  this._logger = logger;
};

/**
 * Connect to the database
 * @method connect
 */
exports.connect = function() {
  if (this._connectionResolver) {
    return this._connectionResolver.promise;
  }
  this._connectionResolver = Promises.defer();

  var config = this._config;
  var databaseURI = config.get('databaseURI');
  var user = config.get('user');
  var password = config.get('password');

  var logger = this._logger;
  logger.info('connecting to database: `%s` as user `%s`', databaseURI, user);

  mongoose.connect(databaseURI, {
    user: user,
    pass: password
  });

  var db = mongoose.connection;

  var self = this;
  db.on('error', function (err) {
    logger.error('Error connecting to database: %s', String(err));
    self._connectionResolver.reject(err);
  });

  db.once('open', function callback() {
    logger.info('Connected to database');
    self._connectionResolver.fulfill(db);
  });

  return self._connectionResolver.promise;
};

