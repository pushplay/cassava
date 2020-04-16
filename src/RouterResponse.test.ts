import * as chai from "chai";
import {RouterResponse} from "./RouterResponse";

describe("RouterResponse", () => {
    describe("getHeader()", () => {
        it("gets the header from the response object, case insensitive", () => {
            const resp: RouterResponse = {
                statusCode: 200,
                body: {},
                headers: {
                    "UpperCase": "correct",
                    "lowercase": "lazy",
                    "ALL-CAPS": "why are you screaming?"
                }
            };

            chai.assert.equal(RouterResponse.getHeader(resp, "UpperCase"), "correct");
            chai.assert.equal(RouterResponse.getHeader(resp, "uppercase"), "correct");

            chai.assert.equal(RouterResponse.getHeader(resp, "LowerCase"), "lazy");
            chai.assert.equal(RouterResponse.getHeader(resp, "lowercase"), "lazy");

            chai.assert.equal(RouterResponse.getHeader(resp, "ALL-CAPS"), "why are you screaming?");
            chai.assert.equal(RouterResponse.getHeader(resp, "All-Caps"), "why are you screaming?");
            chai.assert.equal(RouterResponse.getHeader(resp, "all-caps"), "why are you screaming?");
        });

        it("supports multiValueHeaders", () => {
            const resp: RouterResponse = {
                statusCode: 200,
                body: {},
                headers: {
                    "Single-Only": "in headers",
                    "In-Both": "don't use this one"
                },
                multiValueHeaders: {
                    "In-Both": ["use this one"],
                    "Multiple-Values": ["alpha", "bravo"],
                    "Array-Of-One": ["one"]
                }
            };

            chai.assert.equal(RouterResponse.getHeader(resp, "Single-Only"), "in headers");

            chai.assert.equal(RouterResponse.getHeader(resp, "In-Both"), "use this one");
            chai.assert.equal(RouterResponse.getHeader(resp, "in-both"), "use this one");

            chai.assert.deepEqual(RouterResponse.getHeader(resp, "Multiple-Values"), ["alpha", "bravo"]);
            chai.assert.deepEqual(RouterResponse.getHeader(resp, "multiple-values"), ["alpha", "bravo"]);

            chai.assert.equal(RouterResponse.getHeader(resp, "Array-Of-One"), "one");
            chai.assert.equal(RouterResponse.getHeader(resp, "array-of-one"), "one");
        });
    });

    describe("setHeader()", () => {
        it("sets the header if headers is empty", () => {
            const resp: RouterResponse = {
                statusCode: 200,
                body: {}
            };
            RouterResponse.setHeader(resp, "Foo", "bar");
            RouterResponse.setHeader(resp, "Baz", "qux");

            chai.assert.deepEqual(resp.headers, {"Foo": "bar", "Baz": "qux"})
        });

        it("can set multi-value headers", () => {
            const resp: RouterResponse = {
                statusCode: 200,
                body: {}
            };

            RouterResponse.setHeader(resp, "Foo", "bar");
            chai.assert.deepEqual(resp.headers, {"Foo": "bar"});

            RouterResponse.setHeader(resp, "Foo", "baz");
            chai.assert.deepEqual(resp.headers, {});
            chai.assert.deepEqual(resp.multiValueHeaders, {"Foo": ["bar", "baz"]});

            RouterResponse.setHeader(resp, "Foo", "qux");
            chai.assert.deepEqual(resp.headers, {});
            chai.assert.deepEqual(resp.multiValueHeaders, {"Foo": ["bar", "baz", "qux"]});
        });
    });
});
