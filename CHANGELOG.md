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