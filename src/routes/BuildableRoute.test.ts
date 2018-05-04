import * as chai from "chai";
import * as cassava from "../";
import {createTestProxyEvent, testRouter} from "../testing";
import {jsonSerializer} from "../serializers";

describe("BuildableRoute", () => {
    it("matches from the start of the path", async () => {
        const router = new cassava.Router();

        router.route("/bar/foo")
            .handler(async evt => ({body: {success: true}}));

        const resp = await testRouter(router, createTestProxyEvent("/foo"));

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
    });

    it("has case-insensitive string paths", async () => {
        const router = new cassava.Router();

        router.route("/foo")
            .handler(async evt => ({body: {success: true}}));

        const resp = await testRouter(router, createTestProxyEvent("/Foo"));

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
    });

    describe("path parameters", () => {
        it("routes /{foo} and fills in the param", async () => {
            const router = new cassava.Router();

            router.route("/{foo}")
                .handler(async evt => {
                    return {
                        body: evt.pathParameters["foo"]
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/wuzzle"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, "\"wuzzle\"");
        });

        it("routes /foo/{bar} and fills in the param", async () => {
            const router = new cassava.Router();

            router.route("/foo/{bar}")
                .handler(async evt => {
                    return {
                        body: `foo/${evt.pathParameters["bar"]}`
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo/bizzbuzz"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, "\"foo/bizzbuzz\"");
        });

        it("routes /foo/{bar}/baz and fills in the param", async () => {
            const router = new cassava.Router();

            router.route("/foo/{bar}/baz")
                .handler(async evt => {
                    return {
                        body: `foo/${evt.pathParameters["bar"]}/baz`
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo/bizzbuzz/baz"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, "\"foo/bizzbuzz/baz\"");
        });

        it("routes /foo/{bar}/{baz} and fills in the params", async () => {
            const router = new cassava.Router();

            router.route("/foo/{bar}/{baz}")
                .handler(async evt => {
                    return {
                        body: `foo/${evt.pathParameters["bar"]}/${evt.pathParameters["baz"]}`
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo/bizzbuzz/12345"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, "\"foo/bizzbuzz/12345\"");
        });

        it("doesn't match /foo to /foo/{bar}", async () => {
            const router = new cassava.Router();

            router.route("/foo/{bar}")
                .handler(async evt => {
                    return {
                        body: evt.pathParameters["bar"]
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
        });

        it("doesn't match /foo/bar/baz to /foo/{bar}", async () => {
            const router = new cassava.Router();

            router.route("/foo/{bar}")
                .handler(async evt => {
                    return {
                        body: evt.pathParameters["bar"]
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo/bar/baz"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
        });

        it("doesn't override existing pathParams", async () => {
            const router = new cassava.Router();

            router.route("/{foo}")
                .handler(async evt => {
                    return {
                        body: `${evt.pathParameters["foo"]}/${evt.pathParameters["bar"]}`
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo", "GET", {
                pathParameters: {
                    bar: "originalbar"
                }
            }));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, "\"foo/originalbar\"");
        });

        it("decodes values", async () => {
            const router = new cassava.Router();

            router.route("/path/{foo}/end")
                .handler(async evt => {
                    return {
                        body: evt.pathParameters["foo"]
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/path/(%E2%95%AF%C2%B0%E2%96%A1%C2%B0%EF%BC%89%E2%95%AF%EF%B8%B5%20%E2%94%BB%E2%94%81%E2%94%BB/end", "GET", {
                pathParameters: {
                    bar: "originalbar"
                }
            }));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, "\"(╯°□°）╯︵ ┻━┻\"");
        });

        it("routes regex paths and fills in the matching groups", async () => {
            const router = new cassava.Router();

            router.route(/\/foo\/([^\/]*)\/(.*)/)
                .handler(async evt => {
                    return {
                        body: evt.pathParameters["1"] + "-" + evt.pathParameters["2"] + "!"
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo/happy/birthday/to/you", "GET"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, "\"happy-birthday/to/you!\"");
        });
    });

    describe("serializers()", () => {
        const content = {a: "alpha", b: "bravo"};
        const jsonContent = JSON.stringify(content);
        const xmlContent = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<a>alpha</a><b>bravo</b>";
        const csvContent = "a,b\nalpha,bravo";
        const xmlSerializer = (body: any) => xmlContent;
        const csvSerializer = (body: any) => csvContent;

        it("matches when there is no Accept header", async () => {
            const router = new cassava.Router();

            router.route("/path")
                .serializers({
                    "application/json": jsonSerializer
                })
                .handler(async evt => {
                    return {
                        body: content
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/path", "GET", {headers: {}}));
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, jsonContent);
            chai.assert.equal(resp.headers["Content-Type"], "application/json");
        });

        it("matches an exact Accept to one Content-Type", async () => {
            const router = new cassava.Router();

            router.route("/path")
                .serializers({
                    "application/json": jsonSerializer
                })
                .handler(async evt => {
                    return {
                        body: content
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/path", "GET", {headers: {Accept: "application/json"}}));
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, jsonContent);
            chai.assert.equal(resp.headers["Content-Type"], "application/json");
        });

        it("matches an exact Accept to a list of Content-Types", async () => {
            const router = new cassava.Router();

            router.route("/path")
                .serializers({
                    "application/json": jsonSerializer,
                    "application/xml": xmlSerializer
                })
                .handler(async evt => {
                    return {
                        body: content
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/path", "GET", {headers: {Accept: "application/xml"}}));
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, xmlContent);
            chai.assert.equal(resp.headers["Content-Type"], "application/xml");
        });

        it("matches a list Accept with q values to an exact Content-Type", async () => {
            const router = new cassava.Router();

            router.route("/path")
                .serializers({
                    "application/xml": xmlSerializer
                })
                .handler(async evt => {
                    return {
                        body: content
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/path", "GET", {headers: {Accept: "text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8"}}));
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, xmlContent);
            chai.assert.equal(resp.headers["Content-Type"], "application/xml");
        });

        it("matches a */* Accept to an exact Content-Type", async () => {
            const router = new cassava.Router();

            router.route("/path")
                .serializers({
                    "text/csv": csvSerializer
                })
                .handler(async evt => {
                    return {
                        body: content
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/path", "GET", {headers: {Accept: "text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8"}}));
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, csvContent);
            chai.assert.equal(resp.headers["Content-Type"], "text/csv");
        });

        it("rejects a complete mismatch to one Content-Type", async () => {
            const router = new cassava.Router();

            router.route("/path")
                .serializers({
                    "text/csv": csvSerializer
                })
                .handler(async evt => {
                    return {
                        body: content
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/path", "GET", {headers: {Accept: "text/html, application/xhtml+xml, application/xml;q=0.9"}}));
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
        });

        it("rejects a complete mismatch to a list of Content-Types", async () => {
            const router = new cassava.Router();

            router.route("/path")
                .serializers({
                    "application/json": jsonSerializer,
                    "text/csv": csvSerializer
                })
                .handler(async evt => {
                    return {
                        body: content
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/path", "GET", {headers: {Accept: "text/html, application/xhtml+xml, application/xml;q=0.9"}}));
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
        });
    });
});
