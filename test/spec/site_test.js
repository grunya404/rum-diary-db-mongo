/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*global describe, beforeEach, afterEach, it*/

const assert = require('chai').assert;
const accessLevels = require('rum-diary-access-levels');

const db = Object.create(require('../../index'));
const dbConfig = require('../lib/db-config');
db.init(dbConfig);

const site = db.site;

describe('database', function () {
  beforeEach(function () {
    return db.clear();
  });

  afterEach(function () {
    return db.clear();
  });

  describe('site', function () {
    describe('create', function () {
      it('should create an item', function () {
        return site.create({
          hostname: 'testsite.com'
        }).then(function (site) {
          assert.equal(site.hostname, 'testsite.com');
          assert.equal(site.total_hits, 0);
        });
      });
    });

    describe('getOne', function () {
      beforeEach(function () {
        return site.create({
          hostname: 'testsite.com'
        }).then(function () {
          return site.create({
            hostname: 'rum-diary.org'
          });
        });
      });

      it('should get one matched hostname', function () {
        return site.getOne({
          hostname: 'testsite.com'
        }).then(function (site) {
          assert.equal(site.hostname, 'testsite.com');
          assert.equal(site.total_hits, 0);
        });
      });
    });

    describe('get', function () {
      beforeEach(function () {
        return site.create({
          hostname: 'testsite.com'
        }).then(function () {
          return site.create({
            hostname: 'rum-diary.org'
          });
        });
      });

      it('should return one or more matches', function () {
        return site.get({}).then(function (sites) {
          assert.equal(sites.length, 2);
          assert.equal(sites[0].hostname, 'testsite.com');
          assert.equal(sites[0].total_hits, 0);
          assert.equal(sites[1].hostname, 'rum-diary.org');
          assert.equal(sites[1].total_hits, 0);
        });
      });
    });

    describe('ensureExists', function () {
      it('ensures the site exists', function () {
        return site.ensureExists('testsite.com')
          .then(function (siteReturned) {
            assert.equal(siteReturned.hostname, 'testsite.com');
            assert.equal(siteReturned.total_hits, 0);
          }).then(function () {
            return site.getOne({ hostname: 'testsite.com' });
          })
          .then(function (siteFetched) {
            assert.equal(siteFetched.hostname, 'testsite.com');
            assert.equal(siteFetched.total_hits, 0);
          });
      });
    });

    describe('hit', function () {
      it('should increment the hit_count of the model by one', function () {
        return site.create({ hostname: 'testsite.com' })
          .then(function () {
            return site.hit('testsite.com');
          })
          .then(function () {
            return site.hit('testsite.com');
          })
          .then(function () {
            return site.get({});
          }).then(function (sites) {
            assert.equal(sites[0].hostname, 'testsite.com');
            assert.equal(sites[0].total_hits, 2);
          });
      });
    });

    describe('setUserAccessLevel/isAuthorizedToView', function () {
      it('should return false if user is not authorized', function () {
        return site.create({
          hostname: 'testsite.com'
        }).then(function () {
          return site.isAuthorizedToView('testuser@testuser.com', 'testsite.com');
        }).then(function (isAuthorized) {
          assert.isFalse(isAuthorized);
        });
      });

      it('should return true if user is a readonly user', function () {
        return site.create({
          hostname: 'testsite.com'
        }).then(function () {
          return site.setUserAccessLevel('testuser@testuser.com', 'testsite.com', accessLevels.READONLY);
        }).then(function () {
          return site.isAuthorizedToView('testuser@testuser.com', 'testsite.com');
        }).then(function (isAuthorized) {
          assert.isTrue(isAuthorized);
        });
      });

      it('should return true if user is an admin user', function () {
        return site.create({
          hostname: 'testsite.com'
        }).then(function () {
          return site.setUserAccessLevel('testuser@testuser.com', 'testsite.com', accessLevels.ADMIN);
        }).then(function () {
          return site.isAuthorizedToView('testuser@testuser.com', 'testsite.com');
        }).then(function (isAuthorized) {
          assert.isTrue(isAuthorized);
        });
      });
    });

    describe('setUserAccessLevel', function () {
      describe('to NONE', function () {
        it('removes a user\'s readonly access', function () {
          return site.create({
            hostname: 'testsite.com'
          }).then(function () {
            return site.setUserAccessLevel('testuser@testuser.com', 'testsite.com', accessLevels.READONLY);
          }).then(function () {
            return site.setUserAccessLevel('testuser@testuser.com', 'testsite.com', accessLevels.NONE);
          }).then(function () {
            return site.isAuthorizedToView('testuser@testuser.com', 'testsite.com');
          }).then(function (isAuthorized) {
            assert.isFalse(isAuthorized);
          });
        });

        it('removes a user\'s admin access', function () {
          return site.create({
            hostname: 'testsite.com'
          }).then(function () {
            return site.setUserAccessLevel('testuser@testuser.com', 'testsite.com', accessLevels.ADMIN);
          }).then(function () {
            return site.setUserAccessLevel('testuser@testuser.com', 'testsite.com', accessLevels.NONE);
          }).then(function () {
            return site.isAuthorizedToAdministrate('testuser@testuser.com', 'testsite.com');
          }).then(function (isAuthorized) {
            assert.isFalse(isAuthorized);
          });
        });
      });

      describe('to ADMIN', function () {
        it('adds admin access', function () {
          return site.create({
            hostname: 'testsite.com'
          }).then(function () {
            return site.setUserAccessLevel('testuser@testuser.com', 'testsite.com', accessLevels.ADMIN);
          }).then(function () {
            return site.isAuthorizedToAdministrate('testuser@testuser.com', 'testsite.com');
          }).then(function (isAuthorized) {
            assert.isTrue(isAuthorized);
          });
        });
      });

      describe('to READONLY', function () {
        it('adds readonly access', function () {
          return site.create({
            hostname: 'testsite.com'
          }).then(function () {
            return site.setUserAccessLevel('testuser@testuser.com', 'testsite.com', accessLevels.ADMIN);
          }).then(function () {
            return site.setUserAccessLevel('testuser@testuser.com', 'testsite.com', accessLevels.READONLY);
          }).then(function () {
            return site.isAuthorizedToAdministrate('testuser@testuser.com', 'testsite.com');
          }).then(function (isAuthorized) {
            assert.isFalse(isAuthorized);
          }).then(function () {
            return site.isAuthorizedToView('testuser@testuser.com', 'testsite.com');
          }).then(function (isAuthorized) {
            assert.isTrue(isAuthorized);
          });
        });
      });
    });

    describe('getSitesForUser', function () {
      it('get sites user is owner of', function () {
        return site.create({
          hostname: 'testsite.com',
          owner: 'testuser@testuser.com'
        }).then(function () {
          return site.create({
            hostname: 'othersite.com',
            owner: 'testuser@testuser.com'
          });
        }).then(function () {
          return site.getSitesForUser('testuser@testuser.com');
        }).then(function(sites) {
          assert.equal(sites.length, 2);
          assert.equal(sites[0].hostname, 'testsite.com');
          assert.equal(sites[1].hostname, 'othersite.com');
        });
      });
    });
  });
});
