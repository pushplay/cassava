import * as chai from "chai";
import * as cassava from "../";
import {createTestProxyEvent} from "../testing/createTestProxyEvent";
import {testRouter} from "../testing/index";

describe("BuildableRoute", () => {
    it("matches from the start of the path", async () => {
        const router = new cassava.Router();

        router.route("/bar/foo")
            .handler(async evt => ({body: {success: true}}));

        const resp = await testRouter(router, createTestProxyEvent("/foo"));

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 404, JSON.stringify(resp));
    });

    it("string paths are not case sensitive", async () => {
        const router = new cassava.Router();

        router.route("/foo")
            .handler(async evt => ({body: {success: true}}));

        const resp = await testRouter(router, createTestProxyEvent("/Foo"));

        chai.assert.isObject(resp);
        chai.assert.equal(resp.statusCode, 200, JSON.stringify(resp));
    });
});
