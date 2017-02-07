import * as chai from "chai";
import * as cassava from "../src";
import {createTestProxyEvent} from "./createTestProxyEvent";

describe("Router", () => {
    it("calls the default route", async() => {
        const router = new cassava.Router();
        router.logErrors = false;

        const resp = await new Promise<cassava.ProxyResponse>((resolve, reject) => {
            router.getLambdaHandler()(createTestProxyEvent("/foo/bar"), {} as any, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
    });

    it("calls the first matching handler", async() => {
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

        const resp = await new Promise<cassava.ProxyResponse>((resolve, reject) => {
            router.getLambdaHandler()(createTestProxyEvent("/foo/bar"), {} as any, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
    });

    it("matches from the start of the path", async() => {
        const router = new cassava.Router();
        router.logErrors = false;

        router.route("/bar/foo")
            .handler(async evt => ({body: {success: true}}));

        const resp = await new Promise<cassava.ProxyResponse>((resolve, reject) => {
            router.getLambdaHandler()(createTestProxyEvent("/foo"), {} as any, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
    });

    it("string paths are not case sensitive", async() => {
        const router = new cassava.Router();
        router.logErrors = false;

        router.route("/foo")
            .handler(async evt => ({body: {success: true}}));

        const resp = await new Promise<cassava.ProxyResponse>((resolve, reject) => {
            router.getLambdaHandler()(createTestProxyEvent("/Foo"), {} as any, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
    });

    it("calls all post processors", async() => {
        const router = new cassava.Router();
        router.logErrors = false;

        router.route("/foo/baz")
            .postProcessor(() => {
                throw new Error("don't post process");
            });

        router.route("/foo/bar")
            .postProcessor(async(evt, resp) => {
                resp.body.processor1 = "done";
                return resp;
            });

        router.route("/foo/bar")
            .postProcessor(async(evt, resp) => {
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

        const resp = await new Promise<cassava.ProxyResponse>((resolve, reject) => {
            router.getLambdaHandler()(createTestProxyEvent("/foo/bar"), {} as any, (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
        chai.assert.deepEqual(JSON.parse(resp.body), {
            success: true,
            processor1: "done",
            processor2: "done"
        });
    });

    describe("path parameters", () => {
        it("routes /{foo} and fills in the param", async() => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/{foo}")
                .handler(async evt => {
                    return {
                        body: evt.pathParameters["foo"]
                    };
                });

            const resp = await new Promise<cassava.ProxyResponse>((resolve, reject) => {
                router.getLambdaHandler()(createTestProxyEvent("/wuzzle"), {} as any, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, "wuzzle");
        });

        it("routes /foo/{bar} and fills in the param", async() => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/foo/{bar}")
                .handler(async evt => {
                    return {
                        body: `foo/${evt.pathParameters["bar"]}`
                    };
                });

            const resp = await new Promise<cassava.ProxyResponse>((resolve, reject) => {
                router.getLambdaHandler()(createTestProxyEvent("/foo/bizzbuzz"), {} as any, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, "foo/bizzbuzz");
        });

        it("routes /foo/{bar}/baz and fills in the param", async() => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/foo/{bar}/baz")
                .handler(async evt => {
                    return {
                        body: `foo/${evt.pathParameters["bar"]}/baz`
                    };
                });

            const resp = await new Promise<cassava.ProxyResponse>((resolve, reject) => {
                router.getLambdaHandler()(createTestProxyEvent("/foo/bizzbuzz/baz"), {} as any, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, "foo/bizzbuzz/baz");
        });

        it("routes /foo/{bar}/{baz} and fills in the params", async() => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/foo/{bar}/{baz}")
                .handler(async evt => {
                    return {
                        body: `foo/${evt.pathParameters["bar"]}/${evt.pathParameters["baz"]}`
                    };
                });

            const resp = await new Promise<cassava.ProxyResponse>((resolve, reject) => {
                router.getLambdaHandler()(createTestProxyEvent("/foo/bizzbuzz/12345"), {} as any, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, "foo/bizzbuzz/12345");
        });

        it("doesn't match /foo to /foo/{bar}", async() => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/foo/{bar}")
                .handler(async evt => {
                    return {
                        body: evt.pathParameters["bar"]
                    };
                });

            const resp = await new Promise<cassava.ProxyResponse>((resolve, reject) => {
                router.getLambdaHandler()(createTestProxyEvent("/foo"), {} as any, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
        });

        it("doesn't match /foo/bar/baz to /foo/{bar}", async() => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/foo/{bar}")
                .handler(async evt => {
                    return {
                        body: evt.pathParameters["bar"]
                    };
                });

            const resp = await new Promise<cassava.ProxyResponse>((resolve, reject) => {
                router.getLambdaHandler()(createTestProxyEvent("/foo/bar/baz"), {} as any, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
        });

        it("doesn't override existing pathParams", async() => {
            const router = new cassava.Router();
            router.logErrors = false;

            router.route("/{foo}")
                .handler(async evt => {
                    return {
                        body: `${evt.pathParameters["foo"]}/${evt.pathParameters["bar"]}`
                    };
                });

            const resp = await new Promise<cassava.ProxyResponse>((resolve, reject) => {
                const inputEvt = createTestProxyEvent("/foo");
                inputEvt.pathParameters = {
                    bar: "originalbar"
                };
                router.getLambdaHandler()(inputEvt, {} as any, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            });

            chai.assert.isObject(resp);
            chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
            chai.assert.equal(resp.body, "foo/originalbar");
        });
    });
});
