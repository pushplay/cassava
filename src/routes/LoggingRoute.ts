import {Route} from "./Route";
import {RouterEvent} from "../RouterEvent";
import {RouterResponse} from "../RouterResponse";

/**
 * Logs all requests and responses.
 */
export class LoggingRoute implements Route {

    constructor(public options: LoggingRouteOptions = {}) {
    }

    matches(evt: RouterEvent): boolean {
        return true;
    }

    handle(evt: RouterEvent): void {
        let msg = `${evt.httpMethod} ${evt.path}${this.queryMapToString(evt.queryStringParameters)}`;
        if (!this.options.hideRequestBody && evt.body != null) {
            msg += ` reqbody=${JSON.stringify(evt.body)}`;
        }
        this.log(msg);
    }

    postProcess(evt: RouterEvent, resp: RouterResponse): void {
        let msg = `${evt.httpMethod} ${evt.path}${this.queryMapToString(evt.queryStringParameters)}`;

        if (!this.options.hideRequestBody && evt.body != null) {
            msg += ` reqbody=${JSON.stringify(evt.body)}`;
        }
        msg += ` status=${resp.statusCode || 200}`;
        if (!this.options.hideResponseBody && resp.body != null) {
            msg += ` respbody=${JSON.stringify(resp.body)}`;
        }
        this.log(msg);
    }

    queryMapToString(queryStringParameters: { [key: string]: string } | null): string {
        if (!queryStringParameters) {
            return "";
        }
        const keys = Object.keys(queryStringParameters);
        if (!keys.length) {
            return "";
        }
        return "?" + keys.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryStringParameters[key])}`).join("&");
    }

    log(msg: string): void {
        if (this.options.logFunction) {
            this.options.logFunction(msg);
        } else {
            console.log(msg);
        }
    }
}

export interface LoggingRouteOptions {
    hideRequestBody?: boolean;
    hideResponseBody?: boolean;
    logFunction?: (msg: string) => void;
}
