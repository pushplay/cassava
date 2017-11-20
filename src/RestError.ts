import {httpStatusCode, httpStatusString} from "./httpStatus";

export class RestError extends Error {

    readonly isRestError = true;

    /**
     * An Error that will be caught and turned into a JSON rest response.
     * @param statusCode the HTTP status code to send (defaults to 500)
     * @param message the message for the error (defaults to a description of statusCode)
     * @param additionalParams additional properties to put on the JSON response object
     */
    constructor(public statusCode: number = httpStatusCode.serverError.INTERNAL_SERVER_ERROR,
                message: string = httpStatusString[statusCode] || statusCode.toString(),
                public additionalParams?: { [key: string]: any }) {
        super(message);

        if (typeof statusCode !== "number" || statusCode.toString(10).length !== 3 || statusCode < 100 || statusCode > 599) {
            throw new Error(`illegal HTTP status code ${statusCode}`);
        }
    }
}
