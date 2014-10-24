#!/usr/bin/env node

var fs = require("fs");
var PATH = require("path");
var harmonica = require("./index");
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
        },
        d: {
            alias: "debug",
            describe: "Turn on debug logging",
            boolean: true
        }
    })
    .demand(1)
    .argv;

var harPath = argv._[0];
var har = JSON.parse(fs.readFileSync(harPath));

var configPath = argv.config;
if (!configPath && fs.existsSync(".harmonica.json")) {
    configPath = ".harmonica.json";
}
if (argv.debug) {
    if (configPath) {
        console.log("Using config file from", configPath);
    } else {
        console.log("No config file");
    }
}
var config = parseConfig(configPath ? fs.readFileSync(configPath, "utf8") : null);

harmonica(har, {
    config: config,
    resolvePath: PATH.dirname(configPath),
    port: argv.port,
    debug: argv.debug
});

console.log("Listening at http://localhost:" + argv.port);
console.log("Try " + har.log.entries[0].request.url.replace(/^https/, "http"));