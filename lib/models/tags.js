/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tags model. Tags are scoped to an individual site.

const Model = require('../model');
const Schema = require('mongoose').Schema;

const definition = {
  name: String,
  hostname: String,
  total_hits: {
    type: Number,
    'default': 0
  }
};

const TagsModel = Model.define('Tags', definition);

TagsModel.ensureExists = function(options) {
  var self = this;
  return this.getOne({
                name: options.name,
                hostname: options.hostname
              })
              .then(function(model) {
                if (model) return model;

                return self.create({
                  name: options.name,
                  hostname: options.hostname
                });
              });
};

TagsModel.hit = function(options) {
  return this.findOneAndUpdate(
    options,
    {
      $inc: { total_hits: 1 }
    },
    { upsert: true });
};


module.exports = TagsModel;
