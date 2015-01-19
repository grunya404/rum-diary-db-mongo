/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*global describe, beforeEach, afterEach, it*/

const mocha = require('mocha');
const assert = require('chai').assert;


const db = Object.create(require('../../index'));
const dbConfig = require('../lib/db-config');
db.init(dbConfig);

const tags = db.tags;

const testExtras = require('../lib/test-extras');
const cPass = testExtras.cPass;
const fail = testExtras.fail;

describe('tags', function () {
  beforeEach(function (done) {
    db.clear(done);
  });

  afterEach(function (done) {
    db.clear(done);
  });

  describe('create', function () {
    it('should create an item', function (done) {
      tags.create({
        name: 'tag',
        hostname: 'testsite.com'
      }).then(function (tags) {
        assert.equal(tags.hostname, 'testsite.com');
        assert.equal(tags.total_hits, 0);

        done();
      }, fail);
    });
  });

  describe('getOne', function () {
    beforeEach(function (done) {
      tags.create({
        name: 'tag',
        hostname: 'testsite.com'
      }).then(function () {
        return tags.create({
          name: 'tag2',
          hostname: 'testsite.org'
        });
      }).then(function () {
        return tags.create({
          name: 'tag',
          hostname: 'anothersite.org'
        });
      }).then(cPass(done), fail);
    });

    it('should get one matched hostname', function (done) {
      tags.getOne({
        name: 'tag',
        hostname: 'testsite.com'
      }).then(function (tag) {
        assert.equal(tag.name, 'tag');
        assert.equal(tag.hostname, 'testsite.com');
        assert.equal(tag.total_hits, 0);
        done();
      }, fail);
    });
  });

  describe('get', function () {
    beforeEach(function (done) {
      tags.create({
        tag: 'tag',
        hostname: 'testsite.com'
      }).then(function () {
        return tags.create({
          tag: 'tag2',
          hostname: 'testsite.com'
        });
      }).then(function () {
        return tags.create({
          name: 'tag',
          hostname: 'anothersite.org'
        });
      }).then(cPass(done), fail);
    });

    it('should return one or more matches', function (done) {
      tags.get({ hostname: 'testsite.com' }).then(function (tags) {
        assert.equal(tags.length, 2);
        /*
        assert.equal(tags[0].name, 'tag');
        assert.equal(tags[0].hostname, 'testsite.com');
        assert.equal(tags[0].total_hits, 0);
        assert.equal(tags[0].name, 'tag2');
        assert.equal(tags[1].hostname, 'testsite.com');
        assert.equal(tags[1].total_hits, 0);
        */
        done();
      }, fail);
    });
  });

  describe('ensureExists', function () {
    it('ensures the tags exists', function (done) {
      tags.ensureExists({
          name: 'tag',
          hostname: 'testsite.com'
        })
        .then(function (tagsReturned) {
          assert.equal(tagsReturned.name, 'tag');
          assert.equal(tagsReturned.hostname, 'testsite.com');
          assert.equal(tagsReturned.total_hits, 0);
        }).then(function () {
          return tags.getOne({ hostname: 'testsite.com' });
        })
        .then(function (tagsFetched) {
          assert.equal(tagsFetched.name, 'tag');
          assert.equal(tagsFetched.hostname, 'testsite.com');
          assert.equal(tagsFetched.total_hits, 0);
          done();
        }, fail);
    });
  });

  describe('hit', function () {
    it('should increment the hit_count of the model by one', function (done) {
      tags.hit('testsite.com')
        .then(function () {
          return tags.hit({
            name: 'tag',
            hostname: 'testsite.com'
          });
        })
        .then(function () {
          return tags.get({ name: 'tag', hostname: 'testsite.com' });
        }).then(function (tags) {
          assert.equal(tags[0].name, 'tag');
          assert.equal(tags[0].hostname, 'testsite.com');
          assert.equal(tags[0].total_hits, 1);
          done();
        }, fail);
    });
  });
});
