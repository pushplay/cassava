import * as chai from "chai";
import {RouterEvent} from "./RouterEvent";
import {RestError} from "./RestError";

describe("RouterEvent", () => {
    describe("requireQueryParam()", () => {
        const evt = new RouterEvent();
        evt.queryStringParameters = {
            a: "a",
            b: "b"
        };

        it("can require the param is set", () => {
            evt.requireQueryParam("a");
            evt.requireQueryParam("b");
            chai.assert.throws(() => {
                evt.requireQueryParam("bee");
            }, RestError);
            chai.assert.throws(() => {
                evt.requireQueryParam("c");
            }, RestError);
        });

        it("can require the param is one of a set of values", () => {
            evt.requireQueryParam("a", ["a", "alpha", "aleph"]);
            chai.assert.throws(() => {
                evt.requireQueryParam("b", []);
            }, RestError);
            chai.assert.throws(() => {
                evt.requireQueryParam("b", ["beta"]);
            }, RestError);
            chai.assert.throws(() => {
                evt.requireQueryParam("c", ["c", "charlie"]);
            }, RestError);
        });

        it("can require the param validates against a function", () => {
            evt.requireQueryParam("a", () => true);
            evt.requireQueryParam("a", a => a === "a");
            chai.assert.throws(() => {
                evt.requireQueryParam("b", () => false);
            }, RestError);
            chai.assert.throws(() => {
                evt.requireQueryParam("b", b => b !== "b");
            }, RestError);
            chai.assert.throws(() => {
                evt.requireQueryParam("c", () => true);
            }, RestError);
        });
    });
});
