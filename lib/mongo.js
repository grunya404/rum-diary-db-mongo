/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const _ = require('underscore');
const Promises = require('bluebird');

const NullLogger = require('./null-logger');

const configFile = require('../config.json');
var dbConfig = {
  get: function (item) {
    return configFile[item] || '';
  }
};
const connection = Object.create(require('./mongo-connection'));
connection.init(dbConfig, NullLogger);

var models = {
  pageView: require('./models/page_view'),
  site: require('./models/site'),
  user: require('./models/user'),
  tags: require('./models/tags'),
  invite: require('./models/invite'),
  annotation: require('./models/annotation')
};

_.extend(exports, models);

function eachModel(methodName) {
  var args = [].slice.call(arguments, 1);
  return _.values(models).map(function (model) {
    return model[methodName].apply(model, args);
  });
}

eachModel('init', connection, NullLogger);

exports.clear = function (done) {
  return Promises.all(eachModel('clear'))
    .then(function() {
      if (done) {
        done(null);
      }
    });
};

