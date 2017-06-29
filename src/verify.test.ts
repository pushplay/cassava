import * as chai from "chai";
import * as verify from "./verify";

describe("verify", () => {

    const testObject = {
        o: "oscar",
        b: "bravo",
        j: "juliette",
        e: "echo",
        c: "charlie",
        t: "tango"
    };

    describe("requireKeys()", () => {
        it("doesn't throw an error if there are 0 keys required", () => {
            verify.requireKeys({}, []);
        });

        it("doesn't throw an error if all keys are found", () => {
            verify.requireKeys(testObject, ["o", "b", "j", "e", "c", "t"]);
        });

        it("throws an error if a required key is missing", () => {
            chai.assert.throws(() => {
                verify.requireKeys(testObject, ["j", "o", "k", "e", "r"]);
            });
        });
    });

    describe("blacklistKeys()", () => {
        it("doesn't throw an error if there are 0 keys blacklisted", () => {
            verify.blacklistKeys({}, []);
        });

        it("doesn't throw an error if no keys are found", () => {
            verify.blacklistKeys(testObject, ["bl", "a", "ck"]);
        });

        it("throws an error if a key is found", () => {
            chai.assert.throws(() => {
                verify.blacklistKeys(testObject, ["b", "l", "a", "c", "k"]);
            });
        });
    });

    describe("whitelistKeys()", () => {
        it("doesn't throw an error if there are 0 keys whitelisted", () => {
            verify.whitelistKeys({}, []);
        });

        it("doesn't throw an error if all keys are whitelisted", () => {
            verify.whitelistKeys(testObject, ["o", "b", "j", "e", "c", "t"]);
        });

        it("throws an error if a key is not listed", () => {
            chai.assert.throws(() => {
                verify.whitelistKeys(testObject, ["o", "b", "j"]);
            });
        });
    });
});
