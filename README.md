[![NPM](https://nodei.co/npm/docker-sidecar.png?downloads=true)](https://nodei.co/npm/docker-sidecar/)

[![npm version](https://badge.fury.io/js/docker-sidecar.svg)](http://badge.fury.io/js/docker-sidecar)
# SYNOPSIS

Sidecar watches a list of images from [consul kv](https://www.consul.io/intro/getting-started/kv.html) via a key prefix. The value for each key under the prefix should be a string e.g., `"image:tag"` and sidecar will pull those images automatically into docker.

# USAGE
- Install: `npm i -g docker-sidecar`
- Run: `sidecar --consul http://127.0.0.1:8500 --dir 'test/images'`
- Also useable as a library via `npm i docker-sidecar` or as a Docker image.

## bootstrap

- In addition to pulling the current image list from the consul key-values, you can also specify the `--bootstrap` option and pass a path to a file with images to download at startup.
  - For example `sidecar --consul http://127.0.0.1:8500 --dir 'test/images' --bootstrap /path/to/bootstrap.json`
  - See the [bootstrap example json file](./bootstrap.example.json)

## auth tokens
If using a private registry or a private docker image, `sidecar` uses the standard `~/.docker/config.json` location for auth credentials.

For consul auth, you can use the env variable `sidecar_auths__consul__token=token`.

# EXAMPLE
[![ScreenShot](https://i.imgur.com/TgL9hQO.png?1)](https://i.imgur.com/TgL9hQO.png?1)

Included is a [`docker-compose.yml`](./docker-compose.yml) to serve as a starting point for a set of services. This includes consul, registrator, and the sidecar service all setup for you automatically via compose.

The example runs sidecar with the option `--dir test/images` which means it will watch the consul [kv](https://www.consul.io/intro/getting-started/kv.html) key prefix for changes.

Simply add a new consul key e.g., `test/images/foo` with value `busybox:latest` and hit update in consul (located @ `HOST_IP` or `docker-machine ip default`) and that image will be pulled into the configured docker.


start up our sidecar service
```sh
$ docker-compose -p sidecar build
$ docker-compose -p sidecar up
```

make sure we've got the latest busybox/ubuntu in docker/swarm :

```sh
$ curl -X PUT -d 'busybox:latest' http://$HOST_IP:8500/v1/kv/test/images/busybox
$ curl -X PUT -d 'ubuntu:latest' http://$HOST_IP:8500/v1/kv/test/images/ubuntu
```

refresh the busybox image again (imagine a webhook writing these eventually):
```sh
$ curl -X PUT -d 'busybox:latest' http://$HOST_IP:8500/v1/kv/test/images/busybox
```
