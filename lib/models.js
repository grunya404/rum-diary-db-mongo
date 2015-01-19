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
  /**
   * PageView model
   * @property pageView
   * @type {Object}
   */
  pageView: require('./models/page_view'),
  /**
   * Site model
   * @property site
   * @type {Object}
   */
  site: require('./models/site'),
  /**
   * User model
   * @property user
   * @type {Object}
   */
  user: require('./models/user'),
  /**
   * Tags model
   * @property tags
   * @type {Object}
   */
  tags: require('./models/tags'),
  /**
   * Invite model
   * @property invite
   * @type {Object}
   */
  invite: require('./models/invite'),
  /**
   * Annotation model
   * @property annotation
   * @type {Object}
   */
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
