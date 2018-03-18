import * as chai from "chai";
import * as cassava from "../index";
import {ProxyRoute} from "./ProxyRoute";
import {createTestProxyEvent, testRouter} from "../testing";

// These tests are all written against postman-echo.com rather than node-mitm
// because that's currently broken against the latest node.

describe("ProxyRoute", () => {
    describe("protocol support", () => {
        it("requires a protocol on destPath", () => {
            chai.assert.throws(() => {
                const router = new cassava.Router();
                router.route(new ProxyRoute({
                    srcPath: "/get",
                    destPath: "postman-echo.com/get"
                }));
            });
        });

        it("supports http://", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://postman-echo.com/get"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);
        });

        it("supports https://", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "https://postman-echo.com/get"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);
        });
    });

    describe("path matching", () => {
        it("matches an exact path", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "https://postman-echo.com/get"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);
        });

        it("proxies the subpath", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/",
                destPath: "https://postman-echo.com/"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);
        });

        it("does not proxy substrings", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/ge",
                destPath: "https://postman-echo.com/ge"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 404);
        });

        it("proxies query path segments", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "https://postman-echo.com/get"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get?foo=bar"));
            chai.assert.equal(resp.statusCode, 200);

            const bodyJson = JSON.parse(resp.body);
            chai.assert.deepEqual(bodyJson.args, {foo: "bar"});
        });
    });

    describe("method support", () => {
        it("proxies POST bodies", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/",
                destPath: "https://postman-echo.com/"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/post", "POST", {body: JSON.stringify({foo: "bar"})}));
            chai.assert.equal(resp.statusCode, 200);

            const bodyJson = JSON.parse(resp.body);
            chai.assert.deepEqual(bodyJson.json, {foo: "bar"});
        });

        it("proxies PUT bodies", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/",
                destPath: "https://postman-echo.com/"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/put", "PUT", {body: JSON.stringify({foo: "bar"})}));
            chai.assert.equal(resp.statusCode, 200);

            const bodyJson = JSON.parse(resp.body);
            chai.assert.deepEqual(bodyJson.json, {foo: "bar"});
        });
    });

    describe("additionalHeaders", () => {
        it("adds headers that go out with the request", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://postman-echo.com/get",
                additionalHeaders: {
                    "X-Right-Here": "right now"
                }
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);

            const bodyJson = JSON.parse(resp.body);
            chai.assert.equal(bodyJson.headers["x-right-here"], "right now");
        });

        it("overwrites original headers", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://postman-echo.com/get",
                additionalHeaders: {
                    "X-A": "acme"
                }
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get", "GET", {
                headers: {
                    "X-A": "alpha",
                    "X-B": "bravo"
                }
            }));
            chai.assert.equal(resp.statusCode, 200);

            const bodyJson = JSON.parse(resp.body);
            chai.assert.equal(bodyJson.headers["x-a"], "acme");
            chai.assert.equal(bodyJson.headers["x-b"], "bravo");
        });
    });

    describe("requestMapper", () => {
        it("can cancel the proxy by returning null", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://postman-echo.com/get",
                requestMapper: () => null
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 404);
        });

        it("can modify the request", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://postman-echo.com/get",
                requestMapper: reqArgs => {
                    reqArgs.path += "?foo=bar";
                    return reqArgs;
                }
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);

            const bodyJson = JSON.parse(resp.body);
            chai.assert.deepEqual(bodyJson.args, {foo: "bar"});
        });

        it("can modify the request asynchronously", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://postman-echo.com/get",
                requestMapper: async reqArgs => {
                    await new Promise(res => setTimeout(res, 1));
                    reqArgs.path += "?bar=baz";
                    return reqArgs;
                }
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);

            const bodyJson = JSON.parse(resp.body);
            chai.assert.deepEqual(bodyJson.args, {bar: "baz"});
        });
    });

    describe("bodyMapper", () => {
        it("can modify the body", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/",
                destPath: "https://postman-echo.com/",
                bodyMapper: reqBody => {
                    return {
                        ...reqBody,
                        c: "charlie",
                        d: "delta"
                    };
                }
            }));

            const resp = await testRouter(router, createTestProxyEvent("/post", "POST", {
                body: JSON.stringify({
                    a: "alpha",
                    b: "bravo",
                    c: "cheese"
                })
            }));
            chai.assert.equal(resp.statusCode, 200);

            const bodyJson = JSON.parse(resp.body);
            chai.assert.deepEqual(bodyJson.json, {
                a: "alpha",
                b: "bravo",
                c: "charlie",
                d: "delta"
            });
        });

        it("can modify the body asynchonously", async () => {
            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/",
                destPath: "https://postman-echo.com/",
                bodyMapper: async reqBody => {
                    await new Promise(res => setTimeout(res, 1));
                    return {
                        ...reqBody,
                        c: "charlie",
                        d: "delta"
                    };
                }
            }));

            const resp = await testRouter(router, createTestProxyEvent("/post", "POST", {
                body: JSON.stringify({
                    a: "alpha",
                    b: "bravo",
                    c: "cheese"
                })
            }));
            chai.assert.equal(resp.statusCode, 200);

            const bodyJson = JSON.parse(resp.body);
            chai.assert.deepEqual(bodyJson.json, {
                a: "alpha",
                b: "bravo",
                c: "charlie",
                d: "delta"
            });
        });
    });
});
