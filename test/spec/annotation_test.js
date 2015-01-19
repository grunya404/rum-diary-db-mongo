/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*global describe, beforeEach, afterEach, it*/

const assert = require('chai').assert;

const db = Object.create(require('../../index'));
const dbConfig = require('../lib/db-config');
db.init(dbConfig);

const annotation = db.annotation;

describe('annotation', function () {
  beforeEach(function () {
    return db.clear();
  });

  afterEach(function () {
    return db.clear();
  });

  describe('create', function () {
    it('should create an item', function () {
      var occurredAt = new Date();
      return annotation.create({
        hostname: 'testsite.com',
        title: 'an event',
        description: 'this is an event',
        url: 'http://thereason.com',
        occurredAt: occurredAt
      }).then(function (annotation) {
        assert.equal(annotation.hostname, 'testsite.com');
        assert.equal(annotation.title, 'an event');
        assert.equal(annotation.description, 'this is an event');
        assert.equal(annotation.url, 'http://thereason.com');
        assert.equal(annotation.occurredAt, occurredAt);
      });
    });
  });
});
