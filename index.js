var _fs = require("fs");
var http = require("http");
var URL = require("url");
var PATH = require("path");
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

        var where;
        for (var i = 0; i < config.mappings.length; i++) {
            if ((where = config.mappings[i](request.url))) {
                where = PATH.resolve(resolvePath, where);
                break;
            }
        }

        var content;
        if (where) {
            // If there's local content, but no entry in the HAR, create a shim
            // entry so that we can still serve the file
            // TODO: infer MIME type (maybe just use a static file serving package)
            if (!entry) {
                entry = {
                    response: {
                        status: 200,
                        headers: [],
                        content: {}
                    }
                };
            }
            // If we have a file location, then try and read it. If that fails, then
            // return a 404
            try {
                // TODO: do this asynchronously
                content = fs.readFileSync(where);
            } catch (e) {
                console.error("Error: Could not read", where, "requested from", request.url);
                entry = null;
            }
        }

        if (!entry) {
            console.log("Not found:", request.url);
            response.writeHead(404, "Not found", {"content-type": "text/plain"});
            response.end("404 Not found" + (where ? ", while looking for " + where : ""));
            return;
        }

        for (var h = 0; h < entry.response.headers.length; h++) {
            var name = entry.response.headers[h].name;
            var value = entry.response.headers[h].value;

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

        response.statusCode = entry.response.status;
        // We may already have content from a local file
        if (/^image\//.test(entry.response.content.mimeType)) {
            if (!content) {
                content = entry.response.content.text || "";
                content = new Buffer(content, 'base64');
            }
        } else {
            content = content || entry.response.content.text || "";
            content = content.toString();
            var context = {
                request: request,
                entry: entry
            };
            config.replacements.forEach(function (replacement) {
                content = replacement(content, context);
            });
        }

        if (entry.response.content.size > 0 && !content && !where) {
            console.error("Error:", entry.request.url, "has a non-zero size, but there is no content in the HAR file");
        }

        response.end(content);
    };
}