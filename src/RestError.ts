import {httpStatusCode, httpStatusString} from "./httpStatus";

export class RestError extends Error {
    constructor(public statusCode: number = httpStatusCode.serverError.INTERNAL_SERVER_ERROR, message: string = httpStatusString[statusCode] || statusCode.toString()) {
        super(message);

        if (typeof statusCode !== "number" || statusCode.toString(10).length !== 3 || statusCode < 100 || statusCode > 599) {
            throw new Error(`illegal HTTP status code ${statusCode}`);
        }
    }

    static stringify(err: Error): string {
        return JSON.stringify({
            message: err.message || "",
            statusCode: (err as RestError).statusCode || httpStatusCode.serverError.INTERNAL_SERVER_ERROR
        });
    }
}
