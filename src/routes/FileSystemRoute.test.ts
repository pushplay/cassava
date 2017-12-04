import * as chai from "chai";
import * as cassava from "../index";
import * as path from "path";
import {createTestProxyEvent, testRouter} from "../testing";
import {FileSystemRoute} from "./FileSystemRoute";
import {ProxyResponse} from "../ProxyResponse";

describe("FileSystemRoute", () => {

    const magicValue = "d14b4904-8dd8-4416-aa8d-7d3660c38dbe";

    function assertIsThisFile(resp: ProxyResponse, contentType: string = "video/mp2t"): void {
        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
        chai.assert.equal(resp.headers["Content-Type"], contentType);
        chai.assert.isString(resp.body);

        const body = resp.isBase64Encoded ? Buffer.from(resp.body, "base64").toString("utf-8") : resp.body;
        chai.assert.include(body, magicValue);
    }

    function assertNotFound(resp: ProxyResponse): void {
        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
    }

    it("can get a file", async () => {
        const router = new cassava.Router();
        router.route(new FileSystemRoute({
            fsPath: __dirname,
            restPath: "/"
        }));

        assertIsThisFile(await testRouter(router, createTestProxyEvent("/FileSystemRoute.test.ts")));
    });

    it("can get a file inside a directory", async () => {
        const router = new cassava.Router();
        router.route(new FileSystemRoute({
            fsPath: path.join(__dirname, ".."),
            restPath: "/"
        }));

        assertIsThisFile(await testRouter(router, createTestProxyEvent("/routes/FileSystemRoute.test.ts")));
    });

    it("can set the rest root of the file path", async () => {
        const router = new cassava.Router();
        router.route(new FileSystemRoute({
            fsPath: __dirname,
            restPath: "/umma/gumma/"
        }));

        assertIsThisFile(await testRouter(router, createTestProxyEvent("/umma/gumma/FileSystemRoute.test.ts")));
        assertNotFound(await testRouter(router, createTestProxyEvent("/FileSystemRoute.test.ts")));
        assertNotFound(await testRouter(router, createTestProxyEvent("/routes/FileSystemRoute.test.ts")));
    });

    it("can set additional mime-types", async () => {
        const router = new cassava.Router();
        router.route(new FileSystemRoute({
            fsPath: __dirname,
            restPath: "/",
            mimeTypes: {
                ".ts": "text/x.typescript"
            }
        }));

        assertIsThisFile(await testRouter(router, createTestProxyEvent("/FileSystemRoute.test.ts")), "text/x.typescript");
    });

    it("404s on files that don't exist", async () => {
        const router = new cassava.Router();
        router.route(new FileSystemRoute({
            fsPath: __dirname,
            restPath: "/"
        }));

        assertNotFound(await testRouter(router, createTestProxyEvent("/thisisnotafilethatexists.txt")));
    });

    it("resolves relative paths", async () => {
        const router = new cassava.Router();
        router.route(new FileSystemRoute({
            fsPath: __dirname,
            restPath: "/"
        }));

        assertIsThisFile(await testRouter(router, createTestProxyEvent("/foo/../FileSystemRoute.test.ts")));
        assertIsThisFile(await testRouter(router, createTestProxyEvent("/foo/bar/../../FileSystemRoute.test.ts")));
        assertIsThisFile(await testRouter(router, createTestProxyEvent("/foo/../bar/../FileSystemRoute.test.ts")));
    });

    it("will not gets files in paths outside the fsPath", async () => {
        const router = new cassava.Router();
        router.route(new FileSystemRoute({
            fsPath: __dirname,
            restPath: "/"
        }));

        assertNotFound(await testRouter(router, createTestProxyEvent("/../Router.test.ts")));
        assertNotFound(await testRouter(router, createTestProxyEvent("../Router.test.ts")));
        assertNotFound(await testRouter(router, createTestProxyEvent("/~/.bashrc")));
        assertNotFound(await testRouter(router, createTestProxyEvent("~/.bashrc")));
        assertNotFound(await testRouter(router, createTestProxyEvent("//bin/ls")));
    });
});
