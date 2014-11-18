var makeRequestListener = require("../index").makeRequestListener;

function MockRequest(url) {
    this.url = url;
}

function MockResponse() {}
MockResponse.prototype.setHeader = function() {};
MockResponse.prototype.end = function() {};

describe("path resolution", function () {
    it("resolves paths relative to the resolvePath", function () {
        var readFile = jasmine.createSpy();
        var listener = makeRequestListener([], {
            config: {
                mappings: [function () { return "./dir/name.js"; }],
                replacements: []
            },
            resolvePath: "/root",
            fs: {
                readFile: readFile
            }
        });
        var response = new MockResponse();
        listener(new MockRequest(""), response);
        expect(readFile).toHaveBeenCalled();
        expect(readFile.mostRecentCall.args[0]).toEqual("/root/dir/name.js");
    });
});