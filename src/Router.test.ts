import * as chai from "chai";
import * as cassava from "./";
import {createTestProxyEvent} from "./testing/createTestProxyEvent";
import {testRouter} from "./testing/index";
import {httpStatusString} from "./httpStatus";

describe("Router", () => {
    it("calls the default route", async () => {
        const router = new cassava.Router();
        router.logErrors = false;

        const resp = await testRouter(router, createTestProxyEvent("/foo/bar"));

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
    });

    it("calls the first matching handler", async () => {
        const router = new cassava.Router();
        router.logErrors = false;

        router.route("/foo/baz")
            .handler(() => {
                throw new Error("don't handle");
            });

        router.route("/foo/bar")
            .handler(async evt => ({body: {success: true}}));

        router.route("/foo/bar")
            .handler(() => {
                throw new Error("don't handle either");
            });

        const resp = await testRouter(router, createTestProxyEvent("/foo/bar"));

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
    });

    it("matches from the start of the path", async () => {
        const router = new cassava.Router();
        router.logErrors = false;

        router.route("/bar/foo")
            .handler(async evt => ({body: {success: true}}));

        const resp = await testRouter(router, createTestProxyEvent("/foo"));

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
    });

    it("string paths are not case sensitive", async () => {
        const router = new cassava.Router();
        router.logErrors = false;

        router.route("/foo")
            .handler(async evt => ({body: {success: true}}));

        const resp = await testRouter(router, createTestProxyEvent("/Foo"));

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
    });

    it("calls all post processors", async () => {
        const router = new cassava.Router();
        router.logErrors = false;

        router.route("/foo/baz")
            .postProcessor(() => {
                throw new Error("don't post process");
            });

        router.route("/foo/bar")
            .postProcessor(async (evt, resp) => {
                resp.body.processor1 = "done";
                return resp;
            });

        router.route("/foo/bar")
            .postProcessor(async (evt, resp) => {
                resp.body.processor1 = "not done";
                resp.body.processor2 = "done";
                return resp;
            });

        router.route("/foo/bar")
            .handler(async evt => ({body: {success: true}}));

        router.route("/foo/bar")
            .postProcessor(() => {
                throw new Error("don't post process either");
            });

        const resp = await testRouter(router, createTestProxyEvent("/foo/bar"));

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
        chai.assert.deepEqual(JSON.parse(resp.body), {
            success: true,
            processor1: "done",
            processor2: "done"
        });
    });

    describe("error handling", () => {
        it("relays error messages for RestErrors", async () => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/foo")
                .handler(async evt => {
                    throw new cassava.RestError(400, "This is my custom error message")
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 400, JSON.stringify(resp));
            chai.assert.isObject(JSON.parse(resp.body));
            chai.assert.deepEqual(JSON.parse(resp.body), {
                statusCode: 400,
                message: "This is my custom error message"
            });
        });

        it("does not leak error messages for non-RestErrors", async () => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/foo")
                .handler(async evt => {
                    throw new Error("This error message should not be leaked")
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 500, JSON.stringify(resp));
            chai.assert.isObject(JSON.parse(resp.body));
            chai.assert.deepEqual(JSON.parse(resp.body), {
                statusCode: 500,
                message: httpStatusString[500]
            });
        });
    });

    describe("body handling", () => {
        it("passes along a JSON body", async () => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/{foo}")
                .handler(async evt => {
                    chai.assert.deepEqual(evt.body, body);
                    return {
                        body: evt.body
                    };
                });

            const body = {a: "a"};
            const resp = await testRouter(router, createTestProxyEvent("/foo", "GET", {body: JSON.stringify(body)}));

            chai.assert.isObject(resp);
            chai.assert.deepEqual(JSON.parse(resp.body), body);
        });

        it("passes along a JSON string body", async () => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/{foo}")
                .handler(async evt => {
                    chai.assert.deepEqual(evt.body, body);
                    return {
                        body: evt.body
                    };
                });

            const body = "imma string";
            const resp = await testRouter(router, createTestProxyEvent("/foo", "GET", {
                body: JSON.stringify(body)
            }));

            chai.assert.isObject(resp);
            chai.assert.deepEqual(JSON.parse(resp.body), body);
        });

        it("does not stringify a response body if the Content-Type is text/plain", async () => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/{foo}")
                .handler(async evt => {
                    return {
                        body: body,
                        headers: {
                            "Content-Type": "text/plain"
                        }
                    };
                });

            const body = "imma string";
            const resp = await testRouter(router, createTestProxyEvent("/foo", "GET"));

            chai.assert.isObject(resp);
            chai.assert.deepEqual(resp.body, body);
        });

        it("does not stringify a response body if the Content-Type is text/html", async () => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/{foo}")
                .handler(async evt => {
                    return {
                        body: body,
                        headers: {
                            "Content-Type": "text/html"
                        }
                    };
                });

            const body = "<html><body>Hello world!</body></html>";
            const resp = await testRouter(router, createTestProxyEvent("/foo", "GET"));

            chai.assert.isObject(resp);
            chai.assert.deepEqual(resp.body, body);
        });

        it("does not stringify a request body if the Content-Type is text/plain", async () => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/{foo}")
                .handler(async evt => {
                    chai.assert.deepEqual(evt.body, body);
                    return {
                        body: evt.body,
                        headers: {
                            "Content-Type": "text/plain"
                        }
                    };
                });

            const body = "\"imma string\"";
            const resp = await testRouter(router, createTestProxyEvent("/foo", "POST", {
                body: body,
                headers: {
                    "Content-Type": "text/plain"
                }
            }));

            chai.assert.isObject(resp);
            chai.assert.deepEqual(resp.body, body);
        });
    });

    describe("path parameters", () => {
        it("routes /{foo} and fills in the param", async () => {
            const router = new cassava.Router();
            router.logErrors = false;

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
            router.logErrors = false;

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
            router.logErrors = false;

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
            router.logErrors = false;

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
            router.logErrors = false;

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
            router.logErrors = false;

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
            router.logErrors = false;

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
            router.logErrors = false;

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
            router.logErrors = false;

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
});
