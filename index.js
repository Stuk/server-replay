var fs = require("fs");
var http = require("http");
var URL = require("url");
var heuristic = require("./heuristic");

module.exports = main;
function main(har, options) {
    var entries = har.log.entries;
    var config = options.config;

    var server = http.createServer(function (request, response) {
        request.parsedUrl = URL.parse(request.url, true);

        var entry = heuristic(entries, request);

        var where;
        for (var i = 0; i < config.mappings.length; i++) {
            if ((where = config.mappings[i](request.url))) {
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
                console.error("Could not read", where, "requested from", request.url);
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
        response.end(content);
    });

    server.listen(argv.port);
}

if (require.main === module) {
    var parseConfig = require("./parse-config");
    var argv = require("yargs")
        .usage("Usage: $0 [options] <.har file>")
        .options({
            c: {
                alias: "config",
                describe: "The config file to use"
            },
            p: {
                alias: "port",
                describe: "The port to run the proxy server on",
                default: 8080
            }
        })
        .demand(1)
        .argv;

    var harPath = argv._[0];
    var har = JSON.parse(fs.readFileSync(harPath));

    var configPath = argv.config;
    var config = parseConfig(configPath ? fs.readFileSync(configPath, "utf8") : null);

    main(har, {
        config: config,
        port: argv.port
    });

    console.log("Listening at http://localhost:" + argv.port);
    console.log("Try " + har.log.entries[0].request.url.replace(/^https/, "http"));

}