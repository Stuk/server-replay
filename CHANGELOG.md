# v1.1.0, 2014-10-09

* Fix 304 redirects
* Serve responses with a `null` host
* Thanks to [@stdavis](https://github.com/stdavis) for these fixes!

# v1.0.0, 2014-03-31

* First public release
* Load config file from `./.server-replay.json` and deprecate `./.harmonica.json`

## v0.3.0, 2014-12-04

*  Send correct Content-Type when resource is found locally, but not in the HAR file
*  Handle HAR responses without content text

## v0.2.0, 2014-10-30

* Correctly serve entries that match the method, host and path, but no query strings or headers, instead of serving a 404
* Detect entries that were blocked by the recording client and serve a 410 response with explanation

## v0.1.0, 2014-10-23

* Fix the "binary" file
* Add and improve error messages
* Add `-d`, `--debug` option to show debug messages
* Load config file from `./.harmonica.json` by default

### v0.0.1, 2014-10-20

* Initial release
