/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*global describe, beforeEach, afterEach, it*/

const assert = require('chai').assert;
const Promise = require('bluebird');
const accessLevels = require('rum-diary-access-levels');

const db = Object.create(require('../../index'));
const dbConfig = require('../lib/db-config');
db.init(dbConfig);

const userCollection = db.user;
const siteCollection = db.site;


const testExtras = require('../lib/test-extras');
const fail = testExtras.fail;

describe('user', function () {
  beforeEach(function (done) {
    db.clear(done);
  });

  afterEach(function (done) {
    db.clear(done);
  });

  describe('create', function () {
    it('should create an item', function (done) {
      userCollection.create({
        name: 'Site Administrator',
        email: 'testuser@testuser.com'
      }).then(function (user) {
        assert.equal(user.name, 'Site Administrator');
        assert.equal(user.email, 'testuser@testuser.com');

        done();
      }, fail);
    });
  });

  describe('get', function () {
    it('should get one or more saved users', function (done) {
      userCollection.create({
        name: 'Site Administrator',
        email: 'testuser@testuser.com'
      }).then(function () {
        return userCollection.create({
          name: 'Another Administrator',
          email: 'testuser2@testuser.com'
        });
      }).then(function () {
        return userCollection.get({
          email: 'testuser2@testuser.com'
        });
      }).then(function (users) {
        assert.equal(users[0].name, 'Another Administrator');
        assert.equal(users[0].email, 'testuser2@testuser.com');
        done();
      }, fail);
    });
  });

  describe('getOne', function () {
    it('should get a saved user', function (done) {
      userCollection.create({
        name: 'Site Administrator',
        email: 'testuser@testuser.com'
      }).then(function () {
        return userCollection.create({
          name: 'Another Administrator',
          email: 'testuser2@testuser.com'
        });
      }).then(function () {
        return userCollection.getOne({
          email: 'testuser@testuser.com'
        });
      }).then(function (user) {
        assert.equal(user.name, 'Site Administrator');
        assert.equal(user.email, 'testuser@testuser.com');
        done();
      }, fail);
    });
  });

  describe('deleteUser', function () {
    beforeEach(function () {
      return Promise.all([
        userCollection.create({
          name: 'test user',
          email: 'testuser@testuser.com'
        }),
        userCollection.create({
          name: 'an owner',
          email: 'owner@another.com'
        }),
      ])
      .then(function () {
        return Promise.all([
          siteCollection.registerNewSite('testuser.com', 'testuser@testuser.com'),
          siteCollection.registerNewSite('another.com', 'owner@another.com')
        ]);
      })
      .then(function () {
        return siteCollection.setUserAccessLevel('testuser@testuser.com', 'another.com', accessLevels.ADMIN);
      });
    });

    it('should delete a user, remove any sites they own, and remove access to any sites they have access to', function () {
      return userCollection.deleteUser('testuser@testuser.com')
          .then(function () {
            return userCollection.getOne({ email: 'testuser@testuser.com' });
          })
          .then(function(user) {
            assert.isNull(user);

            return siteCollection.getSitesForUser('testuser@testuser.com');
          })
          .then(function (sites) {
            assert.equal(sites.length, 0);
          });
    });
  });
});
