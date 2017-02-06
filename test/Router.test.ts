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
});

