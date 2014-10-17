var fs = require("fs");
var http = require("http");
var URL = require("url");

var PORT = "8080";

var harPath = process.argv[2];
var har = JSON.parse(fs.readFileSync(harPath));
var entries = har.log.entries;

var server = http.createServer(function (request, response) {
    var entry;
    var url = URL.parse(request.url, true);
    for (var i = 0; i < entries.length; i++) {
        entry = entries[i];
        var entryUrl = URL.parse(entry.request.url, true);
        if (
            request.method === entry.request.method &&
            url.pathname === entryUrl.pathname
        ) {
            if (/^\/api/.test(url.pathname)) {
                if (
                    url.query.q === entryUrl.query.q &&
                    url.query["X-Location"] === entryUrl.query["X-Location"]
                ) {
                    if (request.headers["x-location"]) {
                        if (entry.request.headers.some(function (header) {
                            return header.name.toLowerCase() === "x-location" && header.value === request.headers["x-location"];
                        })) {
                            break;
                        } else {
                            continue;
                        }
                    }
                    console.log(request.url, "->", entry.request.url);
                    break;
                } else {
                    continue;
                }
            }
            break;
        }
    }

    if (i === entries.length) {
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
    var content = entry.response.content.text.replace("scproxy-stage.adobecc.com", "localhost:" + PORT);
    content = content.replace("https://localhost", "http://localhost");
    response.end(content);
});

server.listen(PORT);
console.log("Listening at http://localhost:" + PORT);
console.log("Try http://localhost:" + PORT+ URL.parse(entries[0].request.url).path);

function indexHar(har) {

}