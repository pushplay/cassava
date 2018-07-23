import * as chai from "chai";
import {RouterEvent} from "./RouterEvent";
import {RestError} from "./RestError";

describe("RouterEvent", () => {
    describe("requireQueryStringParameter()", () => {
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

    describe("requireHeader()", () => {
        const evt = new RouterEvent();
        evt.headers = {
            A: "a",
            B: "b"
        };
        evt.headersLowerCase = {
            a: "a",
            b: "b"
        };

        it("can require the header field is set", () => {
            evt.requireHeader("a");
            evt.requireHeader("A");
            evt.requireHeader("b");
            evt.requireHeader("B");
            chai.assert.throws(() => {
                evt.requireHeader("bee");
            }, RestError);
            chai.assert.throws(() => {
                evt.requireHeader("c");
            }, RestError);
        });

        it("can require the header field is one of a set of values", () => {
            evt.requireHeader("a", ["a", "alpha", "aleph"]);
            chai.assert.throws(() => {
                evt.requireHeader("b", []);
            }, RestError);
            chai.assert.throws(() => {
                evt.requireHeader("b", ["beta"]);
            }, RestError);
            chai.assert.throws(() => {
                evt.requireHeader("c", ["c", "charlie"]);
            }, RestError);
        });

        it("can require the header field validates against a function", () => {
            evt.requireHeader("a", () => true);
            evt.requireHeader("a", a => a === "a");
            chai.assert.throws(() => {
                evt.requireHeader("b", () => false);
            }, RestError);
            chai.assert.throws(() => {
                evt.requireHeader("b", b => b !== "b");
            }, RestError);
            chai.assert.throws(() => {
                evt.requireHeader("c", () => true);
            }, RestError);
        });
    });

    describe("blacklistQueryStringParameters()", () => {
        const evt = new RouterEvent();
        evt.queryStringParameters = {
            o: "oscar",
            b: "bravo",
            j: "juliette",
            e: "echo",
            c: "charlie",
            t: "tango"
        };

        it("doesn't throw an error if there are 0 keys blacklisted", () => {
            evt.blacklistQueryStringParameters();
        });

        it("doesn't throw an error if no keys are found", () => {
            evt.blacklistQueryStringParameters("bl", "a", "ck");
        });

        it("throws an error if a key is found", () => {
            chai.assert.throws(() => {
                evt.blacklistQueryStringParameters("b", "l", "a", "c", "k");
            });
        });
    });

    describe("whitelistQueryStringParameters()", () => {
        const evt = new RouterEvent();
        evt.queryStringParameters = {
            o: "oscar",
            b: "bravo",
            j: "juliette",
            e: "echo",
            c: "charlie",
            t: "tango"
        };

        it("doesn't throw an error if all keys are whitelisted", () => {
            const emptyEvt = new RouterEvent();
            emptyEvt.whitelistQueryStringParameters();

            evt.whitelistQueryStringParameters("o", "b", "j", "e", "c", "t");
        });

        it("throws an error if a key is not listed", () => {
            chai.assert.throws(() => {
                evt.whitelistQueryStringParameters();
            });
            chai.assert.throws(() => {
                evt.whitelistQueryStringParameters("o", "b", "j");
            });
        });
    });

    describe("validateBody()", () => {
        const coordinateSchema = {
            "id": "http://json-schema.org/geo",
            "$schema": "http://json-schema.org/draft-06/schema#",
            "description": "A geographical coordinate",
            "type": "object",
            "properties": {
                "latitude": {"type": "number"},
                "longitude": {"type": "number"}
            }
        };

        it("validates a valid body", () => {
            const evt = new RouterEvent();
            evt.body = {
                latitude: 49.2391,
                longitude: -124.0227
            };
            evt.validateBody(coordinateSchema);
        });

        it("throws a RestError on an invalid body", () => {
            const evt = new RouterEvent();
            evt.body = {
                latitude: "49.2391",
                longitude: "-124.0227"
            };
            chai.assert.throws(() => evt.validateBody(coordinateSchema));
        });

        it("allows customization of the RestError status code", () => {
            const evt = new RouterEvent();
            evt.body = {
                latitude: "49.2391",
                longitude: "-124.0227"
            };
            let error: RestError;
            try {
                evt.validateBody(coordinateSchema, {httpStatusCode: 432});
            } catch (e) {
                error = e;
            }
            chai.assert.isDefined(error, "expected error to be thrown");
            chai.assert.equal(error.statusCode, 432);
        });

        it("defaults 'propertyName' to 'requestBody'", () => {
            const evt = new RouterEvent();
            evt.body = ["49.2391", "-124.0227"];
            let error: RestError;
            try {
                evt.validateBody(coordinateSchema);
            } catch (e) {
                error = e;
            }
            chai.assert.isTrue(/\brequestBody\b/.test(error.message));
            chai.assert.isFalse(/\binstance\b/.test(error.message));
        });

        it("can override 'propertyName'", () => {
            const evt = new RouterEvent();
            evt.body = ["49.2391", "-124.0227"];
            let error: RestError;
            try {
                evt.validateBody(coordinateSchema, {propertyName: "coordinate"});
            } catch (e) {
                error = e;
            }
            chai.assert.isTrue(/\bcoordinate\b/.test(error.message));
            chai.assert.isFalse(/\brequestBody\b/.test(error.message));
            chai.assert.isFalse(/\binstance\b/.test(error.message));
        });
    });
});
