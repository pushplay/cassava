import {Route} from "./Route";
import {RouterEvent} from "../RouterEvent";
import {RouterResponse} from "../RouterResponse";

/**
 * Logs all requests and responses.
 */
export class LoggingRoute implements Route {

    constructor(public readonly options: LoggingRouteOptions = {}) {
    }

    matches(evt: RouterEvent): boolean {
        return true;
    }

    handle(evt: RouterEvent): void {
        const msg = this.requestToString(evt);
        this.log(msg);
    }

    postProcess(evt: RouterEvent, resp: RouterResponse): void {
        const msg = `${this.requestToString(evt)} ${this.responseToString(resp)}`;
        this.log(msg);
    }

    requestToString(evt: RouterEvent): string {
        let msg = `${evt.httpMethod} ${evt.path}${this.queryMapToString(evt.queryStringParameters)}`;
        if (!this.options.hideRequestBody && evt.body != null) {
            msg += ` reqbody=${JSON.stringify(evt.body)}`;
        }
        if (this.options.logRequestHeaders) {
            msg += ` reqheaders={${this.headersToString(evt.headers, this.options.logRequestHeaders)}}`;
        }
        return msg;
    }

    responseToString(resp: RouterResponse): string {
        let msg = `status=${resp.statusCode || 200}`;
        if (!this.options.hideResponseBody && resp.body != null) {
            msg += ` respbody=${JSON.stringify(resp.body)}`;
        }
        if (this.options.logResponseHeaders) {
            msg += ` respheaders={${this.headersToString(resp.headers, this.options.logResponseHeaders)}}`;
        }
        return msg;
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

    headersToString(headers: { [key: string]: string }, headersFilter: true | string[]): string {
        let keys = Object.keys(headers);
        if (Array.isArray(headersFilter)) {
            const filterLowerCase = headersFilter.map(h => h.toLowerCase());
            keys = keys.filter(key => filterLowerCase ? filterLowerCase.indexOf(key.toLowerCase()) !== -1 : true);
        }

        return keys.map(key => `${key}=${headers[key]}`).join(", ");
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
    /**
     * Whether to hide the body of the request from logs.
     */
    hideRequestBody?: boolean;

    /**
     * Whether to hide the body of the response from logs.
     */
    hideResponseBody?: boolean;

    /**
     * Function to log requests with (defaults to console.log).
     */
    logFunction?: (msg: string) => void;

    /**
     * `true` to log all request headers or an array of the names of headers to log.
     */
    logRequestHeaders?: true | string[];

    /**
     * `true` to log all response headers or an array of the names of headers to log.
     */
    logResponseHeaders?: true | string[];
}
