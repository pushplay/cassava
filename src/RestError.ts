import {httpStatusCode, httpStatusString} from "./httpStatus";
import {RouterResponse} from "./RouterResponse";

export class RestError extends Error {
    constructor(public statusCode: number = httpStatusCode.serverError.INTERNAL_SERVER_ERROR, message: string = httpStatusString[statusCode] || statusCode.toString()) {
        super(message);

        if (typeof statusCode !== "number" || statusCode.toString(10).length !== 3 || statusCode < 100 || statusCode > 599) {
            throw new Error(`illegal HTTP status code ${statusCode}`);
        }
    }

    toResponse(): RouterResponse {
        return {
            statusCode: this.statusCode,
            body: {
                message: this.message,
                statusCode: this.statusCode
            }
        };
    }
}
