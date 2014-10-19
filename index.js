var fs = require("fs");
var http = require("http");
var URL = require("url");
var heuristic = require("./heuristic");

var PORT = "8080";

var harPath = process.argv[2];
var configPath = process.argv[3];
var har = JSON.parse(fs.readFileSync(harPath));
var config = require(configPath);
var entries = har.log.entries;

var server = http.createServer(function (request, response) {
    request.parsedUrl = URL.parse(request.url, true);


    var entry = heuristic(entries, request);

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
    var content = entry.response.content.text || "";
    if (/^image\//.test(entry.response.content.mimeType)) {
        content = new Buffer(content, 'base64');
    } else {
        content = config.replace(content, request, entry);
        content = content.replace(/https/g, "http");
    }
    response.end(content);
});

server.listen(PORT);
console.log("Listening at http://localhost:" + PORT);
console.log("Try " + entries[0].request.url.replace(/^https/, "http"));

function indexHar(har) {

}