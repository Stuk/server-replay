var fs = require("fs");
var http = require("http");
var URL = require("url");

var PORT = "8080";

var harPath = process.argv[2];
var har = JSON.parse(fs.readFileSync(harPath));
var entries = har.log.entries;

var server = http.createServer(function (request, response) {
    var entry;
    var url = URL.parse(request.url);
    for (var i = 0; i < entries.length; i++) {
        entry = entries[i];
        var entryUrl = URL.parse(entry.request.url);
        if (
            request.method === entry.request.method &&
            url.pathname === entryUrl.pathname
        ) {
            console.log("Found entry", entry.request.url, "for", request.url);
            break;
        }
    }

    if (i === entries.length) {
        console.log("Not found", request.url);
        response.writeHead(404, "Not found", {"content-type": "text/plain"});
        response.end("404 Not found");
        return;
    }

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
    response.end(entry.response.content.text);
});

server.listen(PORT);
console.log("Listening at http://localhost:" + PORT);
console.log("Try http://localhost:" + PORT+ URL.parse(entries[0].request.url).path);

function indexHar(har) {

}