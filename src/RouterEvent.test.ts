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
            evt.requireQueryStringParameter("a");
            evt.requireQueryStringParameter("b");
            chai.assert.throws(() => {
                evt.requireQueryStringParameter("bee");
            }, RestError);
            chai.assert.throws(() => {
                evt.requireQueryStringParameter("c");
            }, RestError);
        });

        it("can require the param is one of a set of values", () => {
            evt.requireQueryStringParameter("a", ["a", "alpha", "aleph"]);
            chai.assert.throws(() => {
                evt.requireQueryStringParameter("b", []);
            }, RestError);
            chai.assert.throws(() => {
                evt.requireQueryStringParameter("b", ["beta"]);
            }, RestError);
            chai.assert.throws(() => {
                evt.requireQueryStringParameter("c", ["c", "charlie"]);
            }, RestError);
        });

        it("can require the param validates against a function", () => {
            evt.requireQueryStringParameter("a", () => true);
            evt.requireQueryStringParameter("a", a => a === "a");
            chai.assert.throws(() => {
                evt.requireQueryStringParameter("b", () => false);
            }, RestError);
            chai.assert.throws(() => {
                evt.requireQueryStringParameter("b", b => b !== "b");
            }, RestError);
            chai.assert.throws(() => {
                evt.requireQueryStringParameter("c", () => true);
            }, RestError);
        });
    });
});
