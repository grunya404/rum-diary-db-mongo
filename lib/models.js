/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const _ = require('underscore');

/**
 * A Models collection.
 *
 * @class Models
 */

/**
 * List of models
 * @property Models
 * @type {Object}
 */
exports.Models = {
  pageView: require('./models/page_view'),
  site: require('./models/site'),
  user: require('./models/user'),
  tags: require('./models/tags'),
  invite: require('./models/invite'),
  annotation: require('./models/annotation')
};

/**
 * Invoke a function on each model.
 * @method invokeMethod
 * @param {String} methodName
 * Name of the method to invoke.
 * @returns {Array}
 * Array of return values from each method invocation
 */
exports.invokeMethod = function(methodName) {
  var args = [].slice.call(arguments, 1);
  return _.values(exports.Models).map(function (model) {
    return model[methodName].apply(model, args);
  });
};
