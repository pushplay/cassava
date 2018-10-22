import * as chai from "chai";
import * as cassava from "../index";
import {LoggingRoute} from "./LoggingRoute";
import {createTestProxyEvent, testRouter} from "../testing";

describe("LoggingRoute", () => {

    const happyRoute: cassava.routes.Route = {
        matches: () => true,
        handle: () => ({
            body: "I am text",
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "text/plain",
                "Date": "Thu, 10 Sept 1982 12:00:00 GMT"
            }
        })
    };

    // Logging to console.log is a pita to test and assumed to work.

    it("can configure the logging function", async () => {
        const msgs: string[] = [];
        const router = new cassava.Router();
        router.route(new LoggingRoute({
            logFunction: msg => msgs.push(msg)
        }));
        router.route(happyRoute);

        await testRouter(router, createTestProxyEvent("/"));
        chai.assert.equal(msgs.length, 2);
    });

    it("can log all request headers", async () => {
        const msgs: string[] = [];
        const router = new cassava.Router();
        router.route(new LoggingRoute({
            logFunction: msg => msgs.push(msg),
            logRequestHeaders: true
        }));
        router.route(happyRoute);

        await testRouter(router, createTestProxyEvent("/", "GET", {
            headers: {
                Accept: "text/plain",
                Host: "www.example.com",
                Origin: "http://www.example.com"
            },
            multiValueHeaders: {
                Accept: ["text/plain"],
                Host: ["www.example.com"],
                Origin: ["http://www.example.com"]
            }
        }));
        chai.assert.equal(msgs.length, 2);
        chai.assert.include(msgs[0], "Accept=text/plain");
        chai.assert.include(msgs[0], "Host=www.example.com");
        chai.assert.include(msgs[0], "Origin=http://www.example.com");
        chai.assert.include(msgs[1], "Accept=text/plain");
        chai.assert.include(msgs[1], "Host=www.example.com");
        chai.assert.include(msgs[1], "Origin=http://www.example.com");
    });

    it("can log a subset of request headers", async () => {
        const msgs: string[] = [];
        const router = new cassava.Router();
        router.route(new LoggingRoute({
            logFunction: msg => msgs.push(msg),
            logRequestHeaders: ["Host", "Kwyjibo"]
        }));
        router.route(happyRoute);

        await testRouter(router, createTestProxyEvent("/", "GET", {
            headers: {
                Accept: "text/plain",
                Host: "www.example.com",
                Origin: "http://www.example.com"
            },
            multiValueHeaders: {
                Accept: ["text/plain"],
                Host: ["www.example.com"],
                Origin: ["http://www.example.com"]
            }
        }));
        chai.assert.equal(msgs.length, 2);
        chai.assert.notInclude(msgs[0], "Accept=text/plain");
        chai.assert.include(msgs[0], "Host=www.example.com");
        chai.assert.notInclude(msgs[0], "Origin=http://www.example.com");
        chai.assert.notInclude(msgs[1], "Accept=text/plain");
        chai.assert.include(msgs[1], "Host=www.example.com");
        chai.assert.notInclude(msgs[1], "Origin=http://www.example.com");
    });

    it("can log all response headers", async () => {
        const msgs: string[] = [];
        const router = new cassava.Router();
        router.route(new LoggingRoute({
            logFunction: msg => msgs.push(msg),
            logResponseHeaders: true
        }));
        router.route(happyRoute);

        await testRouter(router, createTestProxyEvent("/", "GET", {}));
        chai.assert.equal(msgs.length, 2);
        chai.assert.include(msgs[1], "Access-Control-Allow-Origin=*");
        chai.assert.include(msgs[1], "Content-Type=text/plain");
        chai.assert.include(msgs[1], "Date=Thu, 10 Sept 1982 12:00:00 GMT");
    });

    it("can log a subset of response headers", async () => {
        const msgs: string[] = [];
        const router = new cassava.Router();
        router.route(new LoggingRoute({
            logFunction: msg => msgs.push(msg),
            logResponseHeaders: ["Content-Type", "Kwyjibo"]
        }));
        router.route(happyRoute);

        await testRouter(router, createTestProxyEvent("/", "GET", {}));
        chai.assert.equal(msgs.length, 2);
        chai.assert.notInclude(msgs[1], "Access-Control-Allow-Origin=*");
        chai.assert.include(msgs[1], "Content-Type=text/plain");
        chai.assert.notInclude(msgs[1], "Date=Thu, 10 Sept 1982 12:00:00 GMT");
    });
});
