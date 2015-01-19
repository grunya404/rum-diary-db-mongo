/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*global describe, beforeEach, afterEach, it*/

const assert = require('chai').assert;
const accessLevels = require('rum-diary-access-levels');

const db = Object.create(require('../../index'));
const dbConfig = require('../lib/db-config');
db.init(dbConfig);

const invite = db.invite;
const user = db.user;

describe('invite', function () {
  beforeEach(function () {
    return db.clear();
  });

  afterEach(function () {
    return db.clear();
  });

  describe('create', function () {
    it('should create an invitation', function () {
      return invite.create({
        from_email: 'from@testuser.com',
        to_email: 'to@testuser.com',
        hostname: 'testsite.com',
        access_level: accessLevels.ADMIN
      }).then(function (invitation) {
        // a token is created on creation.
        assert.ok(invitation.token);

        // the rest of the properties are passed in.
        assert.equal(invitation.from_email, 'from@testuser.com');
        assert.equal(invitation.to_email, 'to@testuser.com');
        assert.equal(invitation.hostname, 'testsite.com');
        assert.strictEqual(invitation.access_level, accessLevels.ADMIN);
      });
    });

    it('should throw an error if from_email is not a valid user', function () {
      return invite.create({
        from_email: 'from@testuser.com',
        to_email: 'to@testuser.com',
        hostname: 'testsite.com',
        access_level: accessLevels.ADMIN
      }).then(null, function (err) {
        // check for error.
      });
    });

    it('should throw an error if hostname is not a valid site', function () {
      return invite.create({
        from_email: 'from@testuser.com',
        to_email: 'to@testuser.com',
        hostname: 'testsite.com',
        access_level: accessLevels.ADMIN
      }).then(null, function (err) {
        // check for error.
      });
    });
  });

  describe('createIfNotAlreadyInvited', function () {
    it('should create an invite if the invitee does not exist', function () {
      return invite.createIfNotAlreadyInvited({
        from_email: 'from@testuser.com',
        to_email: 'to@testuser.com',
        hostname: 'testsite.com',
        access_level: accessLevels.ADMIN
      }).then(function (invitation) {
        // an invitation is returned.
        assert.ok(invitation.token);
      });
    });

    it('should create an invite if the invitee is already a user', function () {
      return user.create({ email: 'to@testuser.com' })
        .then(function () {
          return invite.createIfNotAlreadyInvited({
            from_email: 'from@testuser.com',
            to_email: 'to@testuser.com',
            hostname: 'testsite.com',
            access_level: accessLevels.ADMIN
          });
        }).then(function (invitation) {
          assert.ok(invitation.token);
        });
    });

    it('should do nothing if the user is already invited', function () {
      return invite.createIfNotAlreadyInvited({
        from_email: 'from@testuser.com',
        to_email: 'to@testuser.com',
        hostname: 'testsite.com',
        access_level: accessLevels.ADMIN
      }).then(function (invitation) {
        // First invitation is sent.
        assert.ok(invitation);

        return invite.createIfNotAlreadyInvited({
          from_email: 'from@testuser.com',
          to_email: 'to@testuser.com',
          hostname: 'testsite.com',
          access_level: accessLevels.ADMIN
        });
      }).then(function (invitation) {
        // User is already invited, no need to invite again.
        assert.isUndefined(invitation);
      });
    });
  });

  describe('tokenInfo', function () {
    it('should return token info if token is valid', function () {
      return invite.create({
        from_email: 'from@testuser.com',
        to_email: 'to@testuser.com',
        hostname: 'testsite.com',
        access_level: accessLevels.ADMIN
      }).then(function (invitation) {
        return invite.tokenInfo(invitation.token);
      }).then(function (tokenInfo) {
        assert.ok(tokenInfo);
        assert.isTrue(tokenInfo.isValid);
      });
    });

    it('should return false if token is valid', function () {
      return invite.tokenInfo('invalid token')
        .then(function(tokenInfo) {
          assert.isFalse(tokenInfo.isValid);
        });
    });

    it('should return tokenInfo with doesInviteeExist: true if invitee exists', function () {
      var invitation;

      return invite.create({
        from_email: 'from@testuser.com',
        to_email: 'to@testuser.com',
        hostname: 'testsite.com',
        access_level: accessLevels.ADMIN
      }).then(function (_invitation) {
        invitation = _invitation;

        return user.create({
          email: 'to@testuser.com'
        });
      }).then(function () {
        return invite.tokenInfo(invitation.token);
      }).then(function (tokenInfo) {
        assert.isTrue(tokenInfo.doesInviteeExist);
      });
    });

    it('should return tokenInfo with doesInviteeExist: false if invitee does not exist', function () {
      return invite.create({
        from_email: 'from@testuser.com',
        to_email: 'to@testuser.com',
        hostname: 'testsite.com',
        access_level: accessLevels.ADMIN
      }).then(function (invitation) {
        return invite.tokenInfo(invitation.token);
      }).then(function (tokenInfo) {
        assert.isFalse(tokenInfo.doesInviteeExist);
      });
    });
  });

  describe('verifyNewUser', function () {
    it('should throw an error on an invalid token', function () {
      return invite.verifyNewUser('invalid token', 'test user')
        .then(function() {
          assert.isTrue(false, 'unexpected success');
        }, function (err) {
          assert.equal(err.message, 'invalid invitation');
        });
    });

    it('should create a user if they do not exist', function () {
      var token;
      return db.site.create({
        hostname: 'testsite.com'
      }).then(function () {
        return invite.create({
          from_email: 'from@testuser.com',
          to_email: 'to@testuser.com',
          hostname: 'testsite.com',
          access_level: accessLevels.ADMIN
        });
      }).then(function (invitation) {
        token = invitation.token;

        // check to ensure user is returned.
        return invite.verifyNewUser(invitation.token, 'test user');
      }).then(function (user) {
        assert.equal(user.email, 'to@testuser.com');
      }).then(function () {
        // check to ensure user is created

        return db.user.getOne({ email: 'to@testuser.com' });
      }).then(function (user) {
        assert.equal(user.email, 'to@testuser.com');

        // check to ensure invitation is deleted.
        return invite.getOne({ token: token });
      }).then(function(invitation) {
        assert.equal(invitation, null);
      });
    });

    it('should throw an error if user already exists', function () {
      var token;
      return db.site.create({
        hostname: 'testsite.com'
      }).then(function () {
        return db.user.create({
          email: 'to@testuser.com',
          name: 'The user'
        });
      }).then(function () {
        return invite.create({
          from_email: 'from@testuser.com',
          to_email: 'to@testuser.com',
          hostname: 'testsite.com',
          access_level: accessLevels.READONLY
        });
      }).then(function (invitation) {
        token = invitation.token;

        // check to ensure user is returned.
        return invite.verifyNewUser(invitation.token, 'A different name');
      }).then(null, function (err) {
        assert.equal(err.message, 'user already exists');

        // check to ensure invitation is not deleted.
        return invite.getOne({ token: token });
      }).then(function(invitation) {
        assert.ok(invitation);
      });
    });
  });

  describe('verifyExistingUser', function () {
    it('should throw an error if user does not exist', function () {
      var token;
      return db.site.create({
        hostname: 'testsite.com'
      }).then(function () {
        return invite.create({
          from_email: 'from@testuser.com',
          to_email: 'to@testuser.com',
          hostname: 'testsite.com',
          access_level: accessLevels.READONLY
        });
      }).then(function (invitation) {
        token = invitation.token;

        // check to ensure an error is thrown.
        return invite.verifyExistingUser(invitation.token);
      }).then(null, function (err) {
        assert.equal(err.message, 'invalid user');

        // check to ensure invitation is not deleted.
        return invite.getOne({ token: token });
      }).then(function(invitation) {
        assert.ok(invitation);
      });
    });

    it('should delete token of existing user', function () {
      var token;
      return db.site.create({
        hostname: 'testsite.com'
      }).then(function () {
        return db.user.create({
          email: 'to@testuser.com',
          name: 'The user'
        });
      }).then(function () {
        return invite.create({
          from_email: 'from@testuser.com',
          to_email: 'to@testuser.com',
          hostname: 'testsite.com',
          access_level: accessLevels.READONLY
        });
      }).then(function (invitation) {
        token = invitation.token;

        // check to ensure user is returned.
        return invite.verifyExistingUser(invitation.token);
      }).then(function (user) {
        assert.equal(user.email, 'to@testuser.com');

        // check to ensure invitation is deleted.
        return invite.getOne({ token: token });
      }).then(function(invitation) {
        assert.equal(invitation, null);
      });
    });
  });
});
