var fs = require("fs");
var http = require("http");
var URL = require("url");
var heuristic = require("./heuristic");
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
var entries = har.log.entries;

var configPath = argv.config;
var config = parseConfig(configPath ? fs.readFileSync(configPath, "utf8") : null);

var server = http.createServer(function (request, response) {
    // console.log(request.method, request.url);
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
            content = fs.readFileSync(where);
        } catch (e) {
            console.error("Could not read", where, "requested from", request.url);
            entry = null;
        }
    }

    if (!entry) {
        console.log("Not found:", request.url);
        // console.log(request.headers);
        response.writeHead(404, "Not found", {"content-type": "text/plain"});
        response.end("404 Not found");
        return;
    }

    // var cookieNames = request.headers.cookie.split(";").map(function (c) { return c.split("=")[0]; });
    // entry.request.cookies.forEach(function (cookie) {
    //     if (cookieNames.indexOf(cookie.name) === -1) {
    //         // console.log("Missing cookie, in the console run:");
    //         console.log("document.cookie = " + JSON.stringify(cookie.name + "=" + cookie.value));
    //     }
    // });

    for (var h = 0; h < entry.response.headers.length; h++) {
        var name = entry.response.headers[h].name;
        var value = entry.response.headers[h].value;

        if (name.toLowerCase() == "content-length") continue;
        if (name.toLowerCase() == "content-encoding") continue;

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
console.log("Listening at http://localhost:" + argv.port);
console.log("Try " + entries[0].request.url.replace(/^https/, "http"));