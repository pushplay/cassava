import * as chai from "chai";
import {createTestProxyEvent} from "./createTestProxyEvent";

describe("createTestProxyEvent", () => {
    it("has sensible defaults", () => {
        const evt = createTestProxyEvent();

        chai.assert.equal(evt.httpMethod, "GET");
        chai.assert.equal(evt.path, "/");
        chai.assert.equal(evt.context.httpMethod, "GET");
    });

    it("can override the method and path", () => {
        const evt = createTestProxyEvent("/foo/bar", "HEAD");

        chai.assert.equal(evt.httpMethod, "HEAD");
        chai.assert.equal(evt.path, "/foo/bar");
        chai.assert.equal(evt.context.httpMethod, "HEAD");
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
        chai.assert.equal(evt.context.httpMethod, "GET");
    });

    it("generates a different requestId each time", () => {
        const evt1 = createTestProxyEvent();
        const evt2 = createTestProxyEvent();

        chai.assert.notEqual(evt1.context.requestId, evt2.context.requestId);
    });
});
