'use strict';
const debug = require('debug')('sidecar');
const EventEmitter = require('events').EventEmitter;
const Bluebird = require('bluebird');
const co = require('bluebird-co');
const promisifyAll = Bluebird.promisifyAll;
const assert = require('assert');
const getEvents = require('./docker-events');

const sidecar = co.wrap(function *(opts) {
  opts = opts || {};
  const consul = opts.consul;
  const docker = promisifyAll(opts.docker);
  const out = new EventEmitter();
  const dir = opts.dir;
  const dockerAuth = opts.dockerAuth;
  const dockerEvents = yield getEvents(docker);

  dockerEvents.on('data', (event) => {
    if (typeof event.status === 'string') {
      out.emit(event.status, event);
    }
  });

  function onFinished (err, output) {
    if (err) {
      out.emit('error', err);
    } else {
      out.emit('finish', output);
    }
  }
  function onProgress (event) {
    out.emit('progress', event);
  }
  const pull = co.wrap(function *() {
    try {
      const maybe_kv = yield consul.kv.get({key: dir, recurse: true});
      if (!maybe_kv) {
        return;
      }
      const keyval = [].concat(maybe_kv);
      const images = keyval.filter(Boolean).map(k => k.Value).filter(Boolean);
      debug('images: %j, auths: %j', images, dockerAuth);
      for (let image of images) {
        const registries = Object.keys(dockerAuth).filter((registry) => image.indexOf(registry) === 0);
        assert(registries.length <= 1);
        debug('using auth', dockerAuth[registries[0]]);
        const stream = yield docker.pullAsync(image, { authconfig: dockerAuth[registries[0]] });
        docker.modem.followProgress(stream, onFinished, onProgress);
      }
    } catch (err) {
      out.emit('error', err);
    }
  });
  const watch = consul.watch({
    method: consul.kv.get,
    options: { key: dir, recurse: true }
  });
  return {
    docker: out,
    pull: pull,
    watch: watch
  };
});

module.exports = sidecar;
