/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*global describe, beforeEach, afterEach, it*/

const mocha = require('mocha');
const assert = require('chai').assert;

const db = require('../../index');
const pageView = db.pageView;

const testExtras = require('../lib/test-extras');
const cPass = testExtras.cPass;
const fail = testExtras.fail;

describe('pageView', function () {
  beforeEach(function (done) {
    db.clear(done);
  });

  afterEach(function (done) {
    db.clear(done);
  });

  describe('save', function () {
    it('should save without an error', function (done) {
      pageView.create({
          uuid: 'the-first-uuid'
        }).then(cPass(done), fail);
    });
  });

  describe('get', function () {
    beforeEach(function (done) {
      pageView.create({
          uuid: 'another-uuid'
        }).then(cPass(done), fail);
    });

    it('should get saved data', function (done) {
      pageView.get()
        .then(function (data) {
          assert.equal(data.length, 1);
          var item = data[0];
          assert.equal(item.uuid, 'another-uuid');
          assert.isDefined(item.createdAt);
          assert.isDefined(item.updatedAt);
          done();
        }, fail);
    });
  });

  describe('get with fields specified', function () {
    beforeEach(function (done) {
      pageView.create({
        uuid: 'third-uuid',
        hostname: 'hostname.com',
        os: 'Mac OSX 10.8'
      }).then(cPass(done), fail);
    });

    it('should get only specified fields', function (done) {
      pageView.get('uuid hostname')
        .then(function (data) {
          assert.equal(data.length, 1);
          var item = data[0];
          assert.equal(item.uuid, 'third-uuid');
          assert.equal(item.hostname, 'hostname.com');
          assert.isUndefined(item.os);
          done();
        }, fail);
    });
  });

  describe('getByHostname', function () {
    beforeEach(function (done) {
      pageView.create({
        hostname: 'shanetomlinson.com',
        uuid: 'first-uuid',
        referrer: 'https://bigsearchcompany.com/search',
        referrer_hostname: 'bigsearchcompany.com',
        referrer_path: '/search',
        returning: true
      }).then(cPass(done), fail);
    });

    it('should return data for the specified hostname', function (done) {
      pageView.getByHostname('shanetomlinson.com')
        .then(function (data) {
          assert.equal(data.length, 1);
          assert.equal(data[0].uuid, 'first-uuid');
          assert.equal(data[0].referrer, 'https://bigsearchcompany.com/search');
          assert.equal(data[0].referrer_hostname, 'bigsearchcompany.com');
          assert.equal(data[0].referrer_path, '/search');
          assert.equal(data[0].returning, true);
          done();
        }, fail);
    });
  });

  describe('get with tags', function () {
    beforeEach(function (done) {
      pageView.create({
        hostname: 'shanetomlinson.com',
        uuid: 'first-uuid',
        referrer: 'bigsearchcompany.com',
        tags: ['experiment1', 'tag']
      }).then(function () {
        return pageView.create({
          hostname: 'shanetomlinson.com',
          uuid: 'second-uuid',
          referrer: 'bigsearchcompany.com',
          tags: ['experiment22', 'tag']
        })
      }).then(cPass(done), fail);
    });

    it('returns item if tag is stored', function (done) {
      pageView.get({ hostname: 'shanetomlinson.com', tags: 'experiment1' })
        .then(function (data) {
          assert.equal(data.length, 1);
          assert.equal(data[0].uuid, 'first-uuid');
          assert.equal(data[0].referrer, 'bigsearchcompany.com');
          assert.equal(data[0].tags[0], 'experiment1');
          assert.equal(data[0].tags[1], 'tag');
          done();
        }, fail);
    });

    it('returns nom matching items if $ne is specified', function (done) {
      pageView.get({ hostname: 'shanetomlinson.com', tags: { $ne: 'experiment1' } })
        .then(function (data) {
          assert.equal(data.length, 1);
          assert.equal(data[0].uuid, 'second-uuid');
          assert.equal(data[0].referrer, 'bigsearchcompany.com');
          assert.equal(data[0].tags[0], 'experiment22');
          assert.equal(data[0].tags[1], 'tag');
          done();
        }, fail);
    });

    it('returns item if other tag is stored', function (done) {
      pageView.get({ tags: ['tag'] })
        .then(function (data) {
          assert.equal(data.length, 2);
          assert.equal(data[0].uuid, 'first-uuid');
          assert.equal(data[0].tags[1], 'tag');
          done();
        }, fail);
    });

    it('returns item if both tags are specified', function (done) {
      pageView.get({ tags: ['tag', 'experiment1'] })
        .then(function (data) {
          assert.equal(data.length, 1);
          assert.equal(data[0].uuid, 'first-uuid');
          assert.equal(data[0].referrer, 'bigsearchcompany.com');
          assert.equal(data[0].tags[0], 'experiment1');
          assert.equal(data[0].tags[1], 'tag');
          done();
        }, fail);
    });

    it('returns no items if any tag is invalid', function (done) {
      pageView.get({ tags: ['tag', 'not_valid'] })
        .then(function (data) {
          assert.equal(data.length, 0);
          done();
        }, fail);
    });

    it('returns no items if tag is not found', function (done) {
      pageView.get({ tags: 'not_valid' })
        .then(function (data) {
          assert.equal(data.length, 0);
          done();
        }, fail);
    });
  });

  describe('getOne', function () {
    beforeEach(function (done) {
      pageView.create({
        hostname: 'shanetomlinson.com',
        uuid: 'first-uuid',
        referrer: 'bigsearchcompany.com',
        tags: ['experiment1', 'tag']
      })
      .then(function () {
        return pageView.create({
          hostname: 'shanetomlinson.com',
          uuid: 'second-uuid',
          referrer: 'bigsearchcompany.com',
          tags: ['experiment22', 'tag']
        });
      })
      .then(cPass(done), fail);
    });

    it('returns one item', function (done) {
      pageView.getOne({ hostname: 'shanetomlinson.com', tags: ['experiment1'] })
        .then(function (item) {
          assert.equal(item.uuid, 'first-uuid');
          assert.equal(item.referrer, 'bigsearchcompany.com');
          assert.equal(item.tags[0], 'experiment1');
          assert.equal(item.tags[1], 'tag');
          done();
        }, fail);
    });
  });

});

