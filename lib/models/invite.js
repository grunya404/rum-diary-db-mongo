/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Invitate a user to join the service or view a site. The token is
// sent out in an email verification. When a user verifies, the entry
// is removed from the table.


const Model = require('../model');
const userCollection = require('./user');

const nodeUUID = require('node-uuid');
function guid() {
  return nodeUUID.v4();
}

const inviteTokenDefinition = {
  token: {
    type: String,
    default: guid
  },
  // TODO - is from_email really needed?
  from_email: String,
  to_email: String,
  // TODO - does hostname and access_level need to be here, or is
  // it enough to add the user to the site when the invite
  // is created?
  hostname: String,
  access_level: Number
};

const InviteTokenModel = Model.define('InviteToken', inviteTokenDefinition);

InviteTokenModel.createIfNotAlreadyInvited = function(item) {
  var self = this;
  // TODO - validate item.

  return self.getOne({ to_email: item.to_email, hostname: item.hostname })
    .then(function(existingInvitation) {
      if (existingInvitation) {
        // user already has an invitation for this host, bail.
        return;
      }

      return self.create(item);
    });
};

InviteTokenModel.tokenInfo = function(token) {
  return this.getOne({ token: token })
    .then(function (invitation) {
      if (! invitation) {
        return { isValid: false };
      }

      return userCollection.getOne({ email: invitation.to_email })
        .then(function (user) {

          invitation.isValid = true;
          invitation.doesInviteeExist = !!user;

          return invitation;
        });
    });
};

/**
 * Invitatations are sent whether invitee is a user or not.
 * If the user is already created, do nothing besides
 * delete the token. If the user is not created,
 * create them and let the user set the name.
 */

InviteTokenModel.verifyExistingUser = function (token) {
  var user;
  var self = this;
  return this.getOne({ token: token })
    .then(function (invitation) {
      if (! invitation) {
        throw new Error('invalid invitation');
      }

      return userCollection.getOne({ email: invitation.to_email });
    })
    .then(function (_user) {
      if (! _user) {
        throw new Error('invalid user');
      }

      user = _user;

      // delete the token last in case of any failures along the way.
      return self.findOneAndDelete({ token: token });
    })
    .then(function () {
      return user;
    });
};

InviteTokenModel.verifyNewUser = function (token, name) {
  var email;
  var user;

  var self = this;
  return this.getOne({ token: token })
    .then(function (invitation) {
      if (! invitation) {
        throw new Error('invalid invitation');
      }

      email = invitation.to_email;

      return userCollection.getOne({ email: email });
    })
    .then(function (_user) {
      if (_user) {
        throw new Error('user already exists');
      }

      return userCollection.create({
        email: email,
        name: name
      });
    }).then(function (_user) {
      user = _user;

      // delete the token last in case the user creation fails, the user
      // should be able to try again.
      return self.findOneAndDelete({ token: token });
    })
    .then(function () {
      return user;
    });
};

module.exports = InviteTokenModel;
