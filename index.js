'use strict';
const debug = require('debug')('sidecar');
const EventEmitter = require('events').EventEmitter;
const Bluebird = require('bluebird');
const co = require('bluebird-co');
const promisifyAll = Bluebird.promisifyAll;
const method = require('bluebird').method;

const sidecar = method(function (opts) {
  opts = opts || {};
  const consul = opts.consul;
  const docker = promisifyAll(opts.docker);
  const out = new EventEmitter();
  const dir = opts.dir;
  const dockerAuth = opts.dockerAuth;
  function onFinished (err, output) {
    //  output is an array with output json parsed objects
    if (err) {
      out.emit(err);
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
      debug('images: %j', images);
      for (let image of images) {
	const stream = yield docker.pullAsync(image, { authconfig: dockerAuth });
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
