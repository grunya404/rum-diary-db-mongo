/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * A null logger, it drops messages on the ground
 * @Module NullLogger
 */

function noOp() {}
const logger = {
  log: noOp,
  info: noOp,
  warn: noOp,
  error: noOp
};

module.exports = logger;
