import {httpStatusCode, httpStatusString} from "./httpStatus";

export class RestError extends Error {

    readonly isRestError = true;

    constructor(public statusCode: number = httpStatusCode.serverError.INTERNAL_SERVER_ERROR, message: string = httpStatusString[statusCode] || statusCode.toString()) {
        super(message);

        if (typeof statusCode !== "number" || statusCode.toString(10).length !== 3 || statusCode < 100 || statusCode > 599) {
            throw new Error(`illegal HTTP status code ${statusCode}`);
        }
    }
}
