/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Site model

const Model = require('../model');

const siteDefinition = {
  hostname: String,
  path: String,
  total_hits: {
    type: Number,
    default: 0
  }
};

const PageModel = Object.create(Model);
PageModel.init('Site', siteDefinition);

PageModel.ensureExists = function (hostname, path) {
  var self = this;
  return this.getOne({ hostname: hostname, path: path })
              .then(function (model) {
                if (model) return model;

                return self.create({
                  hostname: hostname,
                  path: path
                });
              });
};

PageModel.hit = function (hostname, path) {
  return this.findOneAndUpdate(
    { hostname: hostname, path: path },
    {
      $inc: { total_hits: 1 }
    },
    { upsert: true });
};

module.exports = PageModel;
