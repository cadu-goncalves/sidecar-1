# SYNOPSIS

Sidecar watches a list of images from [consul kv](https://www.consul.io/intro/getting-started/kv.html) via a key prefix. The value for each key under the prefix should be a string e.g., `"image:tag"` and sidecar will pull those images automatically into docker.

# USAGE
- Install: `npm i -g docker-sidecar`
- Run: `sidecar --consul http://127.0.0.1 --dir 'test/images'`
- Also useable as a library via `npm i docker-sidecar` or as a Docker image.

# EXAMPLE
[![ScreenShot](https://i.imgur.com/TgL9hQO.png?1)](https://i.imgur.com/TgL9hQO.png?1)

Included is a [`docker-compose.yml`](./docker-compose.yml) to serve as a starting point for a set of services. This includes consul, registrator, and the sidecar service all setup for you automatically via compose.

The example runs sidecar with the option `--dir test/images` which means it will watch the consul [kv](https://www.consul.io/intro/getting-started/kv.html) key prefix for changes.

Simply add a new consul key e.g., `test/images/foo` with value `busybox:latest` and hit update in consul (located @ `HOST_IP` or `docker-machine ip default`) and that image will be pulled into the configured docker.


```sh
$ docker-compose -p sidecar build
$ docker-compose -p sidecar up

$ curl -X PUT -d 'busybox:latest' http://$HOST_IP:8500/v1/kv/test/images/busybox

```
