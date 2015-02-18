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

var matchComment = /^\s*\/\/.*$/gm;

module.exports = function (text) {
    if (!text) {
        return {
            mappings: [],
            replacements: []
        };
    }

    // Strip comments
    text = text.replace(matchComment, "");

    var config = JSON.parse(text);
    if (config.version !== 1) {
        throw new Error("Unsupported config version: " + config.version);
    }

    return {
        mappings: (config.mappings || []).map(function (mapping) {
            var match = parseValue(mapping.match);
            var path = parseValue(mapping.path);

            return function (url) {
                if (url.search(match) !== -1) {
                    return url.replace(match, path);
                }
            };
        }),
        replacements: (config.replacements || []).map(function (replacement) {
            var match = parseValue(replacement.match);
            // by default `replace` doesn't globally replace plain strings,
            // so wrap it in a regex with the global flag set
            if (typeof match === "string") {
                match = new RegExp(escapeStringForRegExp(match), "g");
            }
            var isMatchFn = typeof match == "function";
            var replace = parseValue(replacement.replace);
            var isReplaceFn = typeof replace == "function";

            return function (content, context) {
                var _match = isMatchFn ? match(context) : match;
                if (typeof _match === "string") {
                    _match = new RegExp(escapeStringForRegExp(_match), "g");
                }
                var _replace = isReplaceFn ? replace(context) : replace;
                return content.replace(_match, _replace);
            };
        })
    };
};

function parseValue(value) {
    if (typeof value === "object") {
        if (value.regex) {
            // global regex by default
            return new RegExp(value.regex, value.flags || "g");
        } else if (value.var) {
            var path = value.var;
            return function (context) {
                return getPath(context, path);
            };
        } else {
            throw new Error("Unknown value: " + JSON.stringify(value));
        }
    } else {
        return value;
    }
}

var headDotTail = /^([^\.]+)(\.(.*))?$/;
function getPath(context, path) {
    if (!context || !path) {
        return undefined;
    }

    var parts = headDotTail.exec(path);
    var head = parts[1];
    var tail = parts[3];
    if (!tail) {
        return context[head];
    } else if (context[head]) {
        return getPath(context[head], tail);
    }
    return undefined;
}

// from http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
function escapeStringForRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
