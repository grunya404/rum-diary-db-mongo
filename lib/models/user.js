/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// User model

const Promise = require('bluebird');
const Model = require('../model');
const Site = require('./site');

const userDefinition = {
  name: String,
  email: String
};

const UserModel = Model.define('User', userDefinition);

/**
 * A helper that makes sense here even though most of the logic
 * is contained within the Site model
 */
UserModel.getSites = function (email) {
  return Site.getSitesForUser(email);
};

/**
 * Delete a user, remove any sites they own, and remove access to any sites
 * they have access to.
 */
UserModel.deleteUser = function (email) {
  return Site.deleteSitesOwnedByUser(email)
    .then(function () {
      return Site.clearAccessLevelByUser(email);
    }).then(function () {
      return UserModel.findOneAndDelete({ email: email })
    });
};

module.exports = UserModel;
