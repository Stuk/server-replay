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
