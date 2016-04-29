/*
 * Copyright (c) 2015 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
        (request.parsedUrl.host !== null && entryRequest.parsedUrl.host !== request.parsedUrl.host) ||
        entryRequest.parsedUrl.pathname !== request.parsedUrl.pathname
    ) {
        return 0;
    }

    // One point for matching above requirements
    points += 1;

    // each query
    var entryQuery = entryRequest.parsedUrl.query;
    var requestQuery = request.parsedUrl.query;
    if (entryQuery && requestQuery) {
        for (name in requestQuery) {
            if (entryQuery[name] === undefined) {
                points -= 0.5;
            } else {
                points += stripProtocol(entryQuery[name]) === stripProtocol(requestQuery[name]) ? 1 : 0;
            }
        }

        for (name in entryQuery) {
            if (requestQuery[name] === undefined) {
                points -= 0.5;
            }
        }
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
