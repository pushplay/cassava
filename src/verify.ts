import {RestError} from "./RestError";
import {httpStatusCode} from "./httpStatus";

export function requireKeys(o: Object, keys: string[]): void {
    const existingKeys = Object.keys(o);
    for (const key of keys) {
        if (existingKeys.indexOf(key) === -1) {
            throw new RestError(httpStatusCode.clientError.UNPROCESSABLE_ENTITY, `missing required member ${key}`)
        }
    }
}

export function blacklistKeys(o: Object, keys: string[]): void {
    for (const key of Object.keys(o)) {
        if (keys.indexOf(key) !== -1) {
            throw new RestError(httpStatusCode.clientError.UNPROCESSABLE_ENTITY, `unexpected member ${key}`)
        }
    }
}

export function whitelistKeys(o: Object, keys: string[]): void {
    for (const key of Object.keys(o)) {
        if (keys.indexOf(key) === -1) {
            throw new RestError(httpStatusCode.clientError.UNPROCESSABLE_ENTITY, `unexpected member ${key}`)
        }
    }
}
