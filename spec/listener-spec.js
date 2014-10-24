var makeRequestListener = require("../index").makeRequestListener;

function MockRequest(url) {
    this.url = url;
}

function MockResponse() {}
MockResponse.prototype.setHeader = function() {};
MockResponse.prototype.end = function() {};

describe("path resolution", function () {
    it("resolves paths relative to the resolvePath", function () {
        var readFileSync = jasmine.createSpy();
        var listener = makeRequestListener([], {
            config: {
                mappings: [function () { return "./dir/name.js"; }],
                replacements: []
            },
            resolvePath: "/root",
            fs: {
                readFileSync: readFileSync
            }
        });
        var response = new MockResponse();
        listener(new MockRequest(""), response);
        expect(readFileSync).toHaveBeenCalled();
        expect(readFileSync.mostRecentCall.args[0]).toEqual("/root/dir/name.js");
    });
});