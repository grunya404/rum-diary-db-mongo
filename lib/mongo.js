/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Promise = require('bluebird');

var PageView = require('./models/page_view');
var Site = require('./models/site');
var User = require('./models/user');
var Tags = require('./models/tags');
var Invite = require('./models/invite');
var Annotation = require('./models/annotation');

exports.clear = function(done) {
  return Promise.all([
    PageView.clear(),
    User.clear(),
    Site.clear(),
    Tags.clear(),
    Invite.clear(),
    Annotation.clear()
  ]).then(function() {
    if (done) done(null);
  });
};

exports.pageView = PageView;
exports.pageView.getByHostname = function (hostname, done) {
  return PageView.get({ hostname: hostname }, done);
};


exports.user = User;
exports.site = Site;
exports.tags = Tags;
exports.invite = Invite;
exports.annotation = Annotation
