import {Route} from "./Route";
import {RestError} from "../RestError";
import {httpStatusCode} from "../httpStatus";
import {RouterResponse} from "../RouterResponse";
import {RouterEvent} from "../RouterEvent";

/**
 * Matches all requests and returns the same response every time.
 * Default behaviour is to return a 404 response.
 */
export class DefaultRoute implements Route {

    constructor(
        public statusCode: number = httpStatusCode.clientError.NOT_FOUND,
        public message: string = "Resource not found.  There are no matching paths.  Check the API documentation.") {
    }

    matches(evt: RouterEvent): boolean {
        return true;
    }

    async handle(evt: RouterEvent): Promise<RouterResponse> {
        throw new RestError(this.statusCode, this.message);
    }
}
