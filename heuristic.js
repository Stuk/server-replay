var URL = require("url");

module.exports = function (entries, request) {
    var topPoints = 0;
    var topEntry = null;

    var entry;
    for (var i = 0; i < entries.length; i++) {
        entry = entries[i];
        if (!entry.request.parsedUrl) {
            entry.request.parsedUrl = URL.parse(entry.request.url, true);
        }
        if (!entry.request.indexedHeaders) {
            entry.request.indexedHeaders = indexHeaders(entry.request.headers);
        }
        var points = rate(entry.request, request);
        if (points > topPoints) {
            topPoints = points;
            topEntry = entry;
        }
    }

    return topEntry;
};

function rate(entryRequest, request) {
    var points = 0;
    var name;

    // method, host and pathname must match
    if (
        entryRequest.method !== request.method ||
        entryRequest.parsedUrl.host !== request.parsedUrl.host ||
        entryRequest.parsedUrl.pathname !== request.parsedUrl.pathname
    ) {
        return 0;
    }

    // each query
    var entryQuery = entryRequest.parsedUrl.query;
    var requestQuery = request.parsedUrl.query;
    if (entryQuery && requestQuery) {
        for (name in requestQuery) {
            if (entryQuery[name]) {
                points += stripProtocol(entryQuery[name]) === stripProtocol(requestQuery[name]) ? 1 : 0;
            }
        }
        // TODO handle missing query parameters and adjust score appropriately
    }

    // each header
    var entryHeaders = entryRequest.indexedHeaders;
    var requestHeaders = request.headers;
    for (name in requestHeaders) {
        if (entryHeaders[name]) {
            points += stripProtocol(entryHeaders[name]) === stripProtocol(requestHeaders[name]) ? 1 : 0;
        }
        // TODO handle missing headers and adjust score appropriately
    }

    return points;
}

function stripProtocol(string) {
    return string.replace(/^https?/, "");
}

function indexHeaders(entryHeaders) {
    var headers = {};
    entryHeaders.forEach(function (header) {
        headers[header.name.toLowerCase()] = header.value;
        // TODO handle multiple of the same named header
    });
    return headers;
}