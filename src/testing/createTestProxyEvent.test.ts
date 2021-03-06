import * as chai from "chai";
import {createTestProxyEvent} from "./createTestProxyEvent";

describe("createTestProxyEvent", () => {
    it("has sensible defaults", () => {
        const evt = createTestProxyEvent();

        chai.assert.equal(evt.httpMethod, "GET");
        chai.assert.equal(evt.path, "/");
        chai.assert.equal(evt.requestContext.httpMethod, "GET");
    });

    it("can override the method and path", () => {
        const evt = createTestProxyEvent("/foo/bar", "HEAD");

        chai.assert.equal(evt.httpMethod, "HEAD");
        chai.assert.equal(evt.path, "/foo/bar");
        chai.assert.equal(evt.requestContext.httpMethod, "HEAD");
    });

    it("generates null queryStringParams where there is no query string", () => {
        const evt = createTestProxyEvent("https://www.example.com");

        chai.assert.isNull(evt.queryStringParameters);
        chai.assert.isNull(evt.multiValueQueryStringParameters);
    });

    it("correctly parses and decodes the query string", () => {
        const evt = createTestProxyEvent("https://www.example.com/search/?q=a%2B-b&d=2017-06-29T18%3A58%3A56.832Z&exp=a%20%26%26%20(b%20%7C%7C%20c)%20%3D%3D%20d");

        chai.assert.equal(evt.httpMethod, "GET");
        chai.assert.equal(evt.path, "/search/");
        chai.assert.deepEqual(evt.queryStringParameters, {
            q: "a+-b",
            d: "2017-06-29T18:58:56.832Z",
            exp: "a && (b || c) == d"
        });
        chai.assert.deepEqual(evt.multiValueQueryStringParameters, {
            q: ["a+-b"],
            d: ["2017-06-29T18:58:56.832Z"],
            exp: ["a && (b || c) == d"]
        });
        chai.assert.equal(evt.requestContext.httpMethod, "GET");
    });

    it("correctly generates multiValueQueryStringParameters", () => {
        const evt = createTestProxyEvent("https://www.example.com/foo?a=1&a=2&a=3&b=four");

        chai.assert.equal(evt.httpMethod, "GET");
        chai.assert.equal(evt.path, "/foo");
        chai.assert.deepEqual(evt.queryStringParameters, {
            a: "3",
            b: "four"
        });
        chai.assert.deepEqual(evt.multiValueQueryStringParameters, {
            a: ["1", "2", "3"],
            b: ["four"]
        });
    });

    it("correctly generates headers['X-Forwarded-For']", () => {
        const evt = createTestProxyEvent("https://www.example.com/");

        chai.assert.isString(evt.headers["X-Forwarded-For"]);
        chai.assert.include(evt.headers["X-Forwarded-For"], evt.requestContext.identity.sourceIp);
        chai.assert.isFalse(evt.headers["X-Forwarded-For"].startsWith(evt.requestContext.identity.sourceIp), "X-Forwarded-For should not start with the sourceIp because the sourceIp is an ApiGateway proxy")
        chai.assert.equal(evt.headers["X-Forwarded-For"], evt.multiValueHeaders["X-Forwarded-For"][0]);
    });

    it("merges custom headers", () => {
        const evt = createTestProxyEvent("https://www.example.com/", "GET", {
            headers: {
                "Foo": "Bar"
            },
            multiValueHeaders: {
                "Foo": ["Bar"]
            }
        });

        chai.assert.containsAllKeys(evt.headers, ["Foo", "Accept", "User-Agent"]);
        chai.assert.containsAllKeys(evt.multiValueHeaders, ["Foo", "Accept", "User-Agent"]);
    });

    it("generates a different requestId each time", () => {
        const evt1 = createTestProxyEvent();
        const evt2 = createTestProxyEvent();

        chai.assert.notEqual(evt1.requestContext.requestId, evt2.requestContext.requestId);
    });
});
