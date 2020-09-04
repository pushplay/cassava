import * as chai from "chai";
import * as cassava from "../index";
import {ProxyRoute} from "./ProxyRoute";
import {createTestProxyEvent, testRouter} from "../testing";
import {TLSSocket} from "tls";
import http = require("http");
import mitm = require("mitm");

describe("ProxyRoute", () => {

    let mitmInstance: any;

    beforeEach(() => {
        // mitm shims node's internal request/response constructs so they can be intercepted.
        // A similar project called nock works at a higher level but can't do assertions on
        // the header based on the whole request.
        mitmInstance = mitm();
    });

    afterEach(() => {
        if (mitmInstance) {
            mitmInstance.disable();
            mitmInstance = null;
        }
    });

    function readJsonBody(m: http.IncomingMessage): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let data = "";
            m.on("data", chunk => data += chunk);
            m.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(err);
                }
            });
            m.on("error", err => reject(err));
        });
    }

    describe("protocol support", () => {
        it("requires a protocol on destPath", () => {
            chai.assert.throws(() => {
                const router = new cassava.Router();
                router.route(new ProxyRoute({
                    srcPath: "/get",
                    destPath: "example.com"
                }));
            });
        });

        it("supports http://", async () => {
            mitmInstance.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "GET");
                chai.assert.equal(req.url, "/");

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://www.example.com"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);
        });

        it("supports https://", async () => {
            mitmInstance.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
                // The socket type proves this went over HTTPS.
                chai.assert.instanceOf(req.socket, TLSSocket);
                chai.assert.equal(req.method, "GET");
                chai.assert.equal(req.url, "/");

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "https://www.example.com"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);
        });
    });

    describe("path matching", () => {
        it("matches an exact path", async () => {
            mitmInstance.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "GET");
                chai.assert.equal(req.url, "/");

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://www.example.com"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);
        });

        it("proxies the subpath", async () => {
            mitmInstance.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "GET");
                chai.assert.equal(req.url, "/get");

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/",
                destPath: "http://www.example.com"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);
        });

        it("does not proxy substrings", async () => {
            mitmInstance.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "GET");
                chai.assert.equal(req.url, "/");

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/ge",
                destPath: "http://www.example.com/ge"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 404);
        });

        it("proxies query path segments", async () => {
            mitmInstance.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "GET");
                chai.assert.equal(req.url, "/get?foo=bar");

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "https://www.example.com/get"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get?foo=bar"));
            chai.assert.equal(resp.statusCode, 200);
        });
    });

    describe("method support", () => {
        it("proxies POST bodies", async () => {
            mitmInstance.on("request", async (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "POST");
                chai.assert.equal(req.url, "/post");

                const body = await readJsonBody(req);
                chai.assert.deepEqual(body, {foo: "bar"});

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/",
                destPath: "https://www.example.com"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/post", "POST", {body: JSON.stringify({foo: "bar"})}));
            chai.assert.equal(resp.statusCode, 200);
        });

        it("proxies PUT bodies", async () => {
            mitmInstance.on("request", async (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "PUT");
                chai.assert.equal(req.url, "/put");

                const body = await readJsonBody(req);
                chai.assert.deepEqual(body, {foo: "bar"});

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/",
                destPath: "https://www.example.com/"
            }));

            const resp = await testRouter(router, createTestProxyEvent("/put", "PUT", {body: JSON.stringify({foo: "bar"})}));
            chai.assert.equal(resp.statusCode, 200);
        });
    });

    describe("additionalHeaders", () => {
        it("adds headers that go out with the request", async () => {
            mitmInstance.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "GET");
                chai.assert.equal(req.url, "/");
                chai.assert.equal(req.headers["x-right-here"], "right now");

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://www.example.com",
                additionalHeaders: {
                    "X-Right-Here": "right now"
                }
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);
        });

        it("overwrites original headers", async () => {
            mitmInstance.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "GET");
                chai.assert.equal(req.url, "/get");
                chai.assert.equal(req.headers["x-a"], "acme");
                chai.assert.equal(req.headers["x-b"], "bravo");

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://www.example.com/get",
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
        });
    });

    describe("requestMapper", () => {
        it("can cancel the proxy by returning null", async () => {
            mitmInstance.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "GET");
                chai.assert.equal(req.url, "/");

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://www.example.com/get",
                requestMapper: () => null
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 404);
        });

        it("can modify the request", async () => {
            mitmInstance.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "GET");
                chai.assert.equal(req.url, "/?foo=bar");

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://www.example.com",
                requestMapper: reqArgs => {
                    reqArgs.path += "?foo=bar";
                    return reqArgs;
                }
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);
        });

        it("can modify the request asynchronously", async () => {
            mitmInstance.on("request", (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "GET");
                chai.assert.equal(req.url, "/get?bar=baz");

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/get",
                destPath: "http://www.example.com/get",
                requestMapper: async reqArgs => {
                    await new Promise(res => setTimeout(res, 1));
                    reqArgs.path += "?bar=baz";
                    return reqArgs;
                }
            }));

            const resp = await testRouter(router, createTestProxyEvent("/get"));
            chai.assert.equal(resp.statusCode, 200);
        });
    });

    describe("bodyMapper", () => {
        it("can modify the body", async () => {
            mitmInstance.on("request", async (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "POST");
                chai.assert.equal(req.url, "/post");

                const body = await readJsonBody(req);
                chai.assert.deepEqual(body, {
                    a: "alpha",
                    b: "bravo",
                    c: "charlie",
                    d: "delta"
                });

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/",
                destPath: "https://www.example.com/",
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
        });

        it("can modify the body asynchonously", async () => {
            mitmInstance.on("request", async (req: http.IncomingMessage, res: http.ServerResponse) => {
                chai.assert.equal(req.method, "POST");
                chai.assert.equal(req.url, "/post");

                const body = await readJsonBody(req);
                chai.assert.deepEqual(body, {
                    a: "alpha",
                    b: "bravo",
                    c: "charlie",
                    d: "delta"
                });

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(""));
            });

            const router = new cassava.Router();
            router.route(new ProxyRoute({
                srcPath: "/",
                destPath: "https://www.example.com/",
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
        });
    });
});
