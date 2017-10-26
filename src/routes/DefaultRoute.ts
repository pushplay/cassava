import {Route} from "./Route";
import {RestError} from "../RestError";
import {httpStatusCode} from "../httpStatus";
import {RouterResponse} from "../RouterResponse";
import {RouterEvent} from "../RouterEvent";

export class DefaultRoute implements Route {

    static statusCode = httpStatusCode.clientError.NOT_FOUND;
    static message = "Resource not found.  There are no matching paths.  Check the API documentation.";

    matches(evt: RouterEvent): boolean {
        return true;
    }

    async handle(evt: RouterEvent): Promise<RouterResponse> {
        throw new RestError(DefaultRoute.statusCode, DefaultRoute.message);
    }
}
