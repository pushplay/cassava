import {Route} from "./Route";
import {RouterEvent} from "../RouterEvent";
import {RouterResponse} from "../RouterResponse";

/**
 * Logs all requests and responses.
 */
export class LoggingRoute implements Route {

    matches(evt: RouterEvent): boolean {
        return true;
    }

    handle(evt: RouterEvent): void {
        const msg = `${evt.httpMethod} ${evt.path}${this.queryMapToString(evt.queryStringParameters)} reqbody=${JSON.stringify(evt.body)}`;
        console.log(msg);
    }

    postProcess(evt: RouterEvent, resp: RouterResponse): void {
        const msg = `${evt.httpMethod} ${evt.path}${this.queryMapToString(evt.queryStringParameters)} reqbody=${JSON.stringify(evt.body)} status=${resp.statusCode || 200} respbody=${JSON.stringify(resp.body)}`;
        if (resp.statusCode >= 500) {
            console.error(msg);
        } else {
            console.log(msg);
        }
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
}
