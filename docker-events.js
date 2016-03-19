'use strict';
const parse = require('jsonstream2').parse;
const split = require('split2');
const co = require('bluebird-co');

const getEvents = co.wrap(function *(docker) {
  const dockerEvents = yield docker.getEventsAsync();
  const events = dockerEvents.pipe(split()).pipe(parse());
  return events;
});

module.exports = getEvents;
