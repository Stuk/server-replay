module.exports = function (text) {
    var config = JSON.parse(text);
    if (config.version !== 1) {
        throw new Error("Unsupported config version: " + config.version);
    }

    return {
        mappings: config.mappings.map(function (mapping) {
            var match = parseValue(mapping.match);
            var path = parseValue(mapping.path);

            return function (url) {
                if (match.test(url)) {
                    return url.replace(match, path);
                }
            };
        }),
        replacements: config.replacements.map(function (replacement) {
            var match = parseValue(replacement.match);
            // by default `replace` doesn't globally replace plain string,
            // so wrap it in a regex with the global flag set
            if (typeof match === "string") {
                match = new RegExp(escapeStringForRegExp(match), "g");
            }
            var isMatchFn = typeof match == "function";
            var replace = parseValue(replacement.replace);
            var isReplaceFn = typeof replace == "function";

            return function (content, context) {
                var _match = isMatchFn ? match(context) : match;
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
        }
    } else {
        return value;
    }
}

var headDotTail = /^([^\.]+)(\.(.*))?$/;
function getPath(context, path) {
    if (!context) {
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