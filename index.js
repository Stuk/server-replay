var _fs = require("fs");
var http = require("http");
var URL = require("url");
var PATH = require("path");
var mime = require("mime");
var heuristic = require("./heuristic");

exports = module.exports = harmonica;
function harmonica(har, options) {
    var server = http.createServer(makeRequestListener(har.log.entries, options));

    server.listen(options.port);
}

// Export for testing
exports.makeRequestListener = makeRequestListener;
function makeRequestListener(entries, options) {
    var config = options.config;
    var resolvePath = options.resolvePath;
    var debug = options.debug;
    // for mocking
    var fs = options.fs || _fs;

    return function (request, response) {
        if (debug) {
            console.log(request.method, request.url);
        }
        request.parsedUrl = URL.parse(request.url, true);

        var entry = heuristic(entries, request);

        var localPath;
        for (var i = 0; i < config.mappings.length; i++) {
            if ((localPath = config.mappings[i](request.url))) {
                localPath = PATH.resolve(resolvePath, localPath);
                break;
            }
        }

        if (localPath) {
            // If there's local content, but no entry in the HAR, create a shim
            // entry so that we can still serve the file
            if (!entry) {
                var mimeType = mime.lookup(localPath);
                entry = {
                    response: {
                        status: 200,
                        headers: [{
                            name: 'Content-Type',
                            value: mimeType
                        }],
                        content: {
                            mimeType: mimeType
                        }
                    }
                };
            }

            // If we have a file location, then try and read it. If that fails, then
            // return a 404
            fs.readFile(localPath, function (err, content) {
                if (err) {
                    console.error("Error: Could not read", localPath, "requested from", request.url);
                    serveError(request.url, response, null, localPath);
                    return;
                }

                entry.response.content.buffer = content;
                serveEntry(request, response, entry, config);
            });
        } else {
            if (!serveError(request.url, response, entry && entry.response)) {
                serveEntry(request, response, entry, config);
            }
        }

    };
}

function serveError(requestUrl, response, entryResponse, localPath) {
    if (!entryResponse) {
        console.log("Not found:", requestUrl);
        response.writeHead(404, "Not found", {"content-type": "text/plain"});
        response.end("404 Not found" + (localPath ? ", while looking for " + localPath : ""));
        return true;
    }

    // A resource can be blocked by the client recording the HAR file. Chrome
    // adds an `_error` string property to the response object. Also try
    // detecting missing status for other generators.
    if (entryResponse._error || !entryResponse.status) {
        var error = entryResponse._error ? JSON.stringify(entryResponse._error) : "Missing status";
        response.writeHead(410, error, {"content-type": "text/plain"});
        response.end(
            "HAR response error: " + error +
            "\n\nThis resource might have been blocked by the client recording the HAR file. For example, by the AdBlock or Ghostery extensions."
        );
        return true;
    }

    return false;
}

function serveHeaders(response, entryResponse) {
    // Not really a header, but...
    response.statusCode = entryResponse.status;

    for (var h = 0; h < entryResponse.headers.length; h++) {
        var name = entryResponse.headers[h].name;
        var value = entryResponse.headers[h].value;

        if (name.toLowerCase() === "content-length") continue;
        if (name.toLowerCase() === "content-encoding") continue;
        if (name.toLowerCase() === "cache-control") continue;
        if (name.toLowerCase() === "pragma") continue;

        var existing = response.getHeader(name);
        if (existing) {
            if (Array.isArray(existing)) {
                response.setHeader(name, existing.concat(value));
            } else {
                response.setHeader(name, [existing, value]);
            }
        } else {
            response.setHeader(name, value);
        }
    }

    // Try to make sure nothing is cached
    response.setHeader("cache-control", "no-cache, no-store, must-revalidate");
    response.setHeader("pragma", "no-cache");
}

function manipulateContent(request, entry, replacements) {
    var entryResponse = entry.response;
    var content;
    if (isBinary(entryResponse)) {
        content = entryResponse.content.buffer;
    } else {
        content = entryResponse.content.buffer.toString("utf8");
        var context = {
            request: request,
            entry: entry
        };
        replacements.forEach(function (replacement) {
            content = replacement(content, context);
        });
    }

    if (entryResponse.content.size > 0 && !content) {
        console.error("Error:", entry.request.url, "has a non-zero size, but there is no content in the HAR file");
    }

    return content;
}

function isBase64Encoded(entryResponse) {
    var base64Size = entryResponse.content.size / 0.75;
    var contentSize = entryResponse.content.text.length;
    return contentSize && contentSize >= base64Size && contentSize <= base64Size + 4;
}

// FIXME
function isBinary(entryResponse) {
    return /^image\//.test(entryResponse.content.mimeType);
}

function serveEntry(request, response, entry, config) {
    var entryResponse = entry.response;
    serveHeaders(response, entryResponse);

    if (!entryResponse.content.buffer) {
        if (isBase64Encoded(entryResponse)) {
            entryResponse.content.buffer = new Buffer(entryResponse.content.text || "", 'base64');
        } else {
            entryResponse.content.buffer = new Buffer(entryResponse.content.text || "", 'utf8');
        }
    }

    response.end(manipulateContent(request, entry, config.replacements));
}