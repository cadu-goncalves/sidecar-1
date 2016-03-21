#!/usr/bin/env node
'use strict';

const Bluebird = require('bluebird');
const Consul = require('consul');
const Docker = require('dockerode');
const assert = require('assert');
const bunyan = require('bunyan');
const co = require('bluebird-co');
const extend = require('xtend');
const join = require('path').join;
const log = bunyan.createLogger({name: 'sidecar', level: 'debug'});
const os = require('os');
const parse = require('url').parse;
const rc = require('rc');
const normalizeAuth = require('dockerode-authconfig');

let dockerAuth;
try {
  dockerAuth = normalizeAuth(require(join(os.homedir(), '.docker', 'config.json'))).auths;
} catch (_) {
}
const cfg = rc('sidecar', {
  bootstrap: undefined,
  consul: 'http://127.0.0.1:8500',
  docker: undefined,
  dir: undefined,
  auths: {
    consul: {
      token: undefined
    },
    docker: dockerAuth
  }
}, require('minimist')(process.argv, {
  alias: {
    h: 'help'
  },
  boolean: [ 'help' ]
}));

log.debug({cfg: cfg}, 'config');

const usage = `Usage:
  ${process.argv[1]} [options]

  Options:
    --bootstrap [path]     bootstrap images from a file (JSON or node module).
    --consul    [url]      consul service url, e.g., 'http://127.0.0.1:8500'
    --dir       [str]      consul kv dir/prefix to watch keys, e.g., 'test/images/'
    -h, --help             help

  * note that consul does not like starting prefixes with a '/'

  Config:
    ${cfg}
`;

if (typeof cfg.dir !== 'string' || cfg.dir[0] === '/') {
  console.error(usage);
  process.exit(1);
}

if (cfg.help) {
  console.log(usage);
  process.exit(0);
}

const docker = new Docker(cfg.docker);

function getConsulOpts (opt) {
  assert(typeof opt === 'string');
  const parsed = parse(opt);
  return {
    host: parsed.hostname,
    port: parsed.port,
    secure: parsed.protocol === 'https:'
  };
}

const consulOpts = extend(getConsulOpts(cfg.consul), {
  promisify: Bluebird.fromCallback,
  token: cfg.auths.consul.token
});
const consul = new Consul(consulOpts);

const sidecar = require('..');

co.execute(function *() {
  const puller = yield sidecar({
    consul: consul,
    docker: docker,
    dockerAuth: cfg.auths.docker,
    dir: cfg.dir
  });

  if (cfg.bootstrap) {
    try {
      const images = require(cfg.bootstrap);
      log.info({images: images}, 'bootstrapping from file');
      puller.pull(images);
    } catch (e) {
      console.warn(e.stack);
    }
  }

  puller.watch.on('error', (err) => {
    log.error({err: err}, 'watch error');
  });

  puller.watch.on('change', (data, res) => {
    log.debug({data: data}, 'dir change');
    puller.pull();
  });

  puller.docker.on('error', (err) => {
    console.error(err.stack);
    log.error({err: err}, 'docker error');
  });

  puller.docker.on('pull', (pull) => {
    log.info({pull: pull}, 'docker pull');
  });

  puller.docker.on('engine_connect', (event) => {
    log.debug({event: event}, 'engine_connnect');
    puller.pull();
  });

  log.info('initialized sidecar');
}).done();
