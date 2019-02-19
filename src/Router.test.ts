import * as chai from "chai";
import * as cassava from "./";
import {createTestProxyEvent, testRouter} from "./testing";
import {httpStatusString} from "./httpStatus";
import {RestError} from "./RestError";

describe("Router", () => {

    it("calls the default route", async () => {
        const router = new cassava.Router();

        const resp = await testRouter(router, createTestProxyEvent("/foo/bar"));

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
    });

    it("calls the first matching handler", async () => {
        const router = new cassava.Router();

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

    describe("calling post processors", () => {
        it("calls all matching, earlier post processors", async () => {
            const router = new cassava.Router();

            router.route("/foo/baz")
                .postProcessor(() => {
                    throw new Error("don't post process");
                });

            router.route("/foo/bar")
                .postProcessor(async (evt, resp, handlers) => {
                    chai.assert.lengthOf(handlers, 2);
                    resp.body.processor1 = "done";
                    return resp;
                });

            router.route("/foo/bar")
                .postProcessor(async (evt, resp, handlers) => {
                    chai.assert.lengthOf(handlers, 1);
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

        it("returns handlers array even when error thrown", async () => {
            const router = new cassava.Router();

            router.route("/foo/bar")
                .postProcessor(async (evt, resp, handlers) => {
                    chai.assert.lengthOf(handlers, 3);
                });

            router.route("/foo/bar")
                .postProcessor((evt, resp, handlers) => {
                    chai.assert.lengthOf(handlers, 2);
                    throw new RestError(500, "Same error, different day");
                });

            router.route("/foo/bar")
                .postProcessor(async (evt, resp, handlers) => {
                    chai.assert.lengthOf(handlers, 1);
                    return resp;
                });

            router.route("/foo/bar")
                .handler(async (evt) => {
                    throw new cassava.RestError(500, "Something happened here");
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo/bar"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 500, JSON.stringify(resp));
        });

        it("returns defaultRoute in handlers array if no other routes handle event", async () => {
            const router = new cassava.Router();

            router.route(/.*/)
                .postProcessor(async (evt, resp, handlers) => {
                    chai.assert.lengthOf(handlers, 1);
                    chai.assert.deepEqual(handlers[0], router.defaultRoute);
                    return resp;
                });

            const resp = await testRouter(router, createTestProxyEvent("/path/less/taken"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
        });
    });

    it("returns a response when useLegacyCallbackHandler = true", async () => {
        const router = new cassava.Router();
        router.useLegacyCallbackHandler = true;

        router.route("/foo/bar")
            .handler(async evt => ({body: {success: true}}));

        const resp = await testRouter(router, createTestProxyEvent("/foo/bar"));

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
    });

    describe("path resolution", async () => {
        async function testPathMatching(path: string, route: string, isMatch: boolean): Promise<void> {
            const router = new cassava.Router();
            router.route(route)
                .handler(() => ({
                    body: {
                        success: true
                    }
                }));
            const resp = await testRouter(router, createTestProxyEvent(path));
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, isMatch ? 200 : 404, `path ${path} ${isMatch ? "should match" : "should not match"} ${route}`);
        }

        it("resolves // at start by ignoring the next path element", () => testPathMatching("//foo/bar", "/bar", true));
        it("resolves // in middle", () => testPathMatching("/foo//bar", "/foo/bar", true));
        it("resolves /// in middle", () => testPathMatching("/foo///bar", "/foo/bar", true));
        it("resolves // at end", () => testPathMatching("/foo/bar//", "/foo/bar/", true));
        it("does not strip / at end", () => testPathMatching("/foo/bar/", "/foo/bar", false));
        it("resolves . at start", () => testPathMatching("/./foo/bar", "/foo/bar", true));
        it("resolves . in middle", () => testPathMatching("/foo/./bar", "/foo/bar", true));
        it("resolves . at end", () => testPathMatching("/foo/bar/./", "/foo/bar/", true));
        it("strips .. at start", () => testPathMatching("/../foo/bar", "/foo/bar", true));
        it("resolves .. in middle", () => testPathMatching("/foo/baz/../bar", "/foo/bar", true));
        it("resolves .. at end", () => testPathMatching("/foo/bar/baz/..", "/foo/bar/", true));
        it("resolves too many ..s", () => testPathMatching("/foo/bar/../../../../..", "/", true));
    });

    describe("accepted Route.handle() return types", () => {
        it("void passes through", async () => {
            const router = new cassava.Router();

            let handlerCalled = false;
            router.route("/foo")
                .handler(() => {
                    handlerCalled = true;
                    return;
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo"));

            chai.assert.isTrue(handlerCalled);
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
        });

        it("null passes through", async () => {
            const router = new cassava.Router();

            let handlerCalled = false;
            router.route("/foo")
                .handler(() => {
                    handlerCalled = true;
                    return null;
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo"));

            chai.assert.isTrue(handlerCalled);
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
        });

        it("RouterResponse is returned", async () => {
            const router = new cassava.Router();

            router.route("/foo")
                .handler(() => {
                    return {
                        body: {
                            drum: "bass"
                        }
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.deepEqual(JSON.parse(resp.body), {
                drum: "bass"
            });
        });

        it("Promise<void> passes through", async () => {
            const router = new cassava.Router();

            let handlerCalled = false;
            router.route("/foo")
                .handler(async () => {
                    handlerCalled = true;
                    return;
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo"));

            chai.assert.isTrue(handlerCalled);
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
        });

        it("Promise<null> passes through", async () => {
            const router = new cassava.Router();

            let handlerCalled = false;
            router.route("/foo")
                .handler(async () => {
                    handlerCalled = true;
                    return null;
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo"));

            chai.assert.isTrue(handlerCalled);
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
        });

        it("Promise<RouterResponse> is returned", async () => {
            const router = new cassava.Router();

            router.route("/foo")
                .handler(async () => {
                    return {
                        body: {
                            hip: "hop"
                        }
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo"));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.deepEqual(JSON.parse(resp.body), {
                hip: "hop"
            });
        });
    });

    describe("request body handling", () => {
        it("parses an application/json request body", async () => {
            const router = new cassava.Router();

            router.route("/{foo}")
                .handler(async evt => {
                    return {
                        body: evt.body.a,
                        headers: {
                            "Content-Type": "text/plain"
                        }
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo", "POST", {
                body: JSON.stringify({a: "alpha"}),
                headers: {
                    "Content-Type": "application/json"
                }
            }));

            chai.assert.isObject(resp);
            chai.assert.equal(resp.body, "alpha");
        });

        it("passes the raw request body to the handler", async () => {
            const body = JSON.stringify({
                a: "alpha",
                b: "beta"
            });

            const router = new cassava.Router();

            router.route("/{foo}")
                .handler(async evt => {
                    chai.assert.isString(evt.bodyRaw);
                    chai.assert.strictEqual(evt.bodyRaw, body);

                    return {
                        body: evt.body
                    };
                });

            const resp = await testRouter(router, createTestProxyEvent("/foo", "POST", {
                body: body,
                headers: {
                    "Content-Type": "application/json"
                }
            }));

            chai.assert.isObject(resp);
            chai.assert.deepEqual(JSON.parse(resp.body), JSON.parse(body));
        });

        it("throws a 400 error if the application/json body is malformed", async () => {
            const router = new cassava.Router();

            const resp = await testRouter(router, createTestProxyEvent("/foo", "POST", {
                body: "{key: \"must be in quotes\"}",
                headers: {
                    "Content-Type": "application/json"
                }
            }));
            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 400);
        });

        it("does not parse a text/plain request body", async () => {
            const router = new cassava.Router();

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

    describe("response body handling", () => {
        it("passes along a JSON body", async () => {
            const router = new cassava.Router();

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
    });

    describe("error handling", () => {
        describe("RestError handling", () => {
            it("RestErrors thrown from handle() are returned", async () => {
                const router = new cassava.Router();

                router.route("/foo")
                    .handler(async evt => {
                        throw new cassava.RestError(400, "This is my custom error message");
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

            it("RestErrors thrown from postProcess() are returned", async () => {
                const router = new cassava.Router();

                router.route({
                    matches: () => true,
                    postProcess: () => {
                        throw new RestError(418, "I'm a teapot.");
                    }
                });

                router.route("/foo")
                    .handler(async evt => ({body: {success: true}}));

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 418, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
                chai.assert.deepEqual(JSON.parse(resp.body), {
                    statusCode: 418,
                    message: "I'm a teapot."
                });
            });

            it("RestErrors thrown from defaultRoute.handle() are returned", async () => {
                const router = new cassava.Router();

                router.defaultRoute = {
                    matches: () => true,
                    handle: () => {
                        throw new RestError(403, "You have 15 seconds to comply.");
                    }
                };

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 403, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
                chai.assert.deepEqual(JSON.parse(resp.body), {
                    statusCode: 403,
                    message: "You have 15 seconds to comply."
                });
            });

            it("the custom error handler does not get called", async () => {
                const router = new cassava.Router();

                router.route("/foo")
                    .handler(async evt => {
                        throw new cassava.RestError(400, "This is my custom error message");
                    });

                let errorHandlerCalled = false;
                router.errorHandler = async () => {
                    errorHandlerCalled = true;
                    return {
                        status: 503,
                        body: {
                            fruit: "loops"
                        }
                    };
                };

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isFalse(errorHandlerCalled);
                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 400, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
            });

            it("post processors are still called", async () => {
                const router = new cassava.Router();

                let postProcessorCalled = false;
                router.route({
                    matches: () => true,
                    postProcess: (evt, res) => {
                        chai.assert.equal(res.statusCode, 400);
                        postProcessorCalled = true;
                    }
                });

                router.route("/foo")
                    .handler(async evt => {
                        throw new cassava.RestError(400, "This is my custom error message");
                    });

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isTrue(postProcessorCalled);
                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 400, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
            });

            describe("additionalParams", () => {
                it("get added to the body of the response", async () => {
                    const router = new cassava.Router();

                    router.route("/foo")
                        .handler(async evt => {
                            throw new cassava.RestError(400, "This is my custom error message", {a: "alpha", b: "beta"});
                        });

                    const resp = await testRouter(router, createTestProxyEvent("/foo"));

                    chai.assert.isObject(resp);
                    chai.assert.equal(resp.statusCode, 400, JSON.stringify(resp));
                    chai.assert.isObject(JSON.parse(resp.body));
                    chai.assert.deepEqual(JSON.parse(resp.body), {
                        statusCode: 400,
                        message: "This is my custom error message",
                        a: "alpha",
                        b: "beta"
                    });
                });

                it("override built-in properties", async () => {
                    const router = new cassava.Router();

                    router.route("/foo")
                        .handler(async evt => {
                            throw new cassava.RestError(400, "This is my custom error message", {
                                statusCode: 123,
                                message: "pretty sneaky, sis"
                            });
                        });

                    const resp = await testRouter(router, createTestProxyEvent("/foo"));

                    chai.assert.isObject(resp);
                    chai.assert.equal(resp.statusCode, 400, JSON.stringify(resp));
                    chai.assert.isObject(JSON.parse(resp.body));
                    chai.assert.deepEqual(JSON.parse(resp.body), {
                        statusCode: 123,
                        message: "pretty sneaky, sis"
                    });
                });

                it("can be empty", async () => {
                    const router = new cassava.Router();

                    router.route("/foo")
                        .handler(async evt => {
                            throw new cassava.RestError(400, "This is my custom error message", {});
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

                for (const value of [true, false, 0, 1, null, undefined, (): any => undefined]) {
                    it(`can be ${value} (value is ignored)`, async () => {
                        const router = new cassava.Router();

                        router.route("/foo")
                            .handler(async evt => {
                                throw new cassava.RestError(400, "This is my custom error message", value as any);
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
                }
            });
        });

        describe("default error handling", () => {
            it("does not leak messages from handle()", async () => {
                const router = new cassava.Router();
                router.errorHandler = null;

                router.route("/foo")
                    .handler(async () => {
                        throw new Error("This error message should not be leaked");
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

            it("does not leak messages from postProcess()", async () => {
                const router = new cassava.Router();
                router.errorHandler = null;

                router.route({
                    matches: () => true,
                    postProcess: () => {
                        throw new Error("I'm the world's angriest teapot and I will kill your whole family.");
                    }
                });

                router.route("/foo")
                    .handler(async evt => ({body: {success: true}}));

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 500, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
                chai.assert.deepEqual(JSON.parse(resp.body), {
                    statusCode: 500,
                    message: httpStatusString[500]
                });
            });

            it("does not leak messages from defaultRoute.handle()", async () => {
                const router = new cassava.Router();
                router.errorHandler = null;

                router.defaultRoute = {
                    matches: () => true,
                    handle: () => {
                        throw new Error("I apologize for the previous teapot.");
                    }
                };

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 500, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
                chai.assert.deepEqual(JSON.parse(resp.body), {
                    statusCode: 500,
                    message: httpStatusString[500]
                });
            });

            it("post processors are still called", async () => {
                const router = new cassava.Router();
                router.errorHandler = null;

                let postProcessorCalled = false;
                router.route({
                    matches: () => true,
                    postProcess: (evt, res) => {
                        chai.assert.equal(res.statusCode, 500);
                        postProcessorCalled = true;
                    }
                });

                router.route("/foo")
                    .handler(async evt => {
                        throw new Error("All teapots report for sensitivity training.");
                    });

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isTrue(postProcessorCalled);
                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 500, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
            });
        });

        describe("custom error handling", () => {
            it("gets called on non-RestErrors", async () => {
                const router = new cassava.Router();

                router.route("/foo")
                    .handler(async () => {
                        throw new Error("Everything was beautiful and nothing hurt.");
                    });

                let errorHandlerCalled = false;
                router.errorHandler = (err, evt, ctx) => {
                    chai.assert.isObject(evt);
                    chai.assert.equal(evt.httpMethod, "GET");
                    chai.assert.equal(evt.path, "/foo");
                    chai.assert.isObject(ctx);
                    chai.assert.isString(ctx.functionName);
                    errorHandlerCalled = true;
                };

                await testRouter(router, createTestProxyEvent("/foo"));
                chai.assert.isTrue(errorHandlerCalled);
            });

            it("can return a RestResponse", async () => {
                const router = new cassava.Router();

                router.route("/foo")
                    .handler(async () => {
                        throw new Error("Everything was beautiful and nothing hurt.");
                    });

                let errorHandlerCalled = false;
                router.errorHandler = (err, evt, ctx) => {
                    chai.assert.isObject(evt);
                    chai.assert.equal(evt.httpMethod, "GET");
                    chai.assert.isObject(ctx);
                    chai.assert.isString(ctx.functionName);
                    errorHandlerCalled = true;
                    return {
                        statusCode: 503,
                        body: {
                            errMessage: err.message
                        }
                    };
                };

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isTrue(errorHandlerCalled);
                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 503, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
                chai.assert.deepEqual(JSON.parse(resp.body), {
                    errMessage: "Everything was beautiful and nothing hurt."
                });
            });

            it("can return a Promise<RestResponse>", async () => {
                const router = new cassava.Router();

                router.route("/foo")
                    .handler(async () => {
                        throw new Error("So it goes.");
                    });

                let errorHandlerCalled = false;
                router.errorHandler = async err => {
                    errorHandlerCalled = true;
                    return {
                        statusCode: 503,
                        body: {
                            errMessage: err.message
                        }
                    };
                };

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isTrue(errorHandlerCalled);
                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 503, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
                chai.assert.deepEqual(JSON.parse(resp.body), {
                    errMessage: "So it goes."
                });
            });

            it("void falls back to default error handler", async () => {
                const router = new cassava.Router();
                router.errorHandler = null;

                router.route("/foo")
                    .handler(async () => {
                        throw new Error("This error message should not be leaked");
                    });

                let errorHandlerCalled = false;
                router.errorHandler = () => {
                    errorHandlerCalled = true;
                };

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isTrue(errorHandlerCalled);
                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 500, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
                chai.assert.deepEqual(JSON.parse(resp.body), {
                    statusCode: 500,
                    message: httpStatusString[500]
                });
            });

            it("null falls back to default error handler", async () => {
                const router = new cassava.Router();
                router.errorHandler = null;

                router.route("/foo")
                    .handler(async () => {
                        throw new Error("This error message should not be leaked");
                    });

                let errorHandlerCalled = false;
                router.errorHandler = () => {
                    errorHandlerCalled = true;
                    return null;
                };

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isTrue(errorHandlerCalled);
                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 500, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
                chai.assert.deepEqual(JSON.parse(resp.body), {
                    statusCode: 500,
                    message: httpStatusString[500]
                });
            });

            it("Promise<void> falls back to default error handler", async () => {
                const router = new cassava.Router();
                router.errorHandler = null;

                router.route("/foo")
                    .handler(async () => {
                        throw new Error("This error message should not be leaked");
                    });

                let errorHandlerCalled = false;
                router.errorHandler = async () => {
                    errorHandlerCalled = true;
                };

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isTrue(errorHandlerCalled);
                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 500, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
                chai.assert.deepEqual(JSON.parse(resp.body), {
                    statusCode: 500,
                    message: httpStatusString[500]
                });
            });

            it("Promise<null> falls back to default error handler", async () => {
                const router = new cassava.Router();
                router.errorHandler = null;

                router.route("/foo")
                    .handler(async () => {
                        throw new Error("This error message should not be leaked");
                    });

                let errorHandlerCalled = false;
                router.errorHandler = async () => {
                    errorHandlerCalled = true;
                    return null;
                };

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isTrue(errorHandlerCalled);
                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 500, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
                chai.assert.deepEqual(JSON.parse(resp.body), {
                    statusCode: 500,
                    message: httpStatusString[500]
                });
            });

            it("post processors are still called", async () => {
                const router = new cassava.Router();
                router.errorHandler = null;

                let postProcessorCalled = false;
                router.route({
                    matches: () => true,
                    postProcess: (evt, res) => {
                        chai.assert.equal(res.statusCode, 500);
                        postProcessorCalled = true;
                    }
                });

                let errorHandlerCalled = false;
                router.errorHandler = async () => {
                    errorHandlerCalled = true;
                    return null;
                };

                router.route("/foo")
                    .handler(async evt => {
                        throw new Error("All teapots report for sensitivity training.");
                    });

                const resp = await testRouter(router, createTestProxyEvent("/foo"));

                chai.assert.isTrue(errorHandlerCalled);
                chai.assert.isTrue(postProcessorCalled);
                chai.assert.isObject(resp);
                chai.assert.equal(resp.statusCode, 500, JSON.stringify(resp));
                chai.assert.isObject(JSON.parse(resp.body));
            });
        });
    });
});
