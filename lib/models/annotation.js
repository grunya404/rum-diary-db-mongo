/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Annotation model.
 * An annotation is an "event" on the hits graph. Useful for explaining
 * why a particular anomaly occurs.
 */

const Model = require('../model');

const annotationDefinition = {
  hostname: String,
  title: String,
  description: String,
  url: String,
  occurredAt: Date
};

const AnnotationModel = Object.create(Model);
AnnotationModel.init('Annotation', annotationDefinition);

module.exports = AnnotationModel;
