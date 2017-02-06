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

    async handle(evt: RouterEvent): Promise<RouterResponse> {
        const msg = `${evt.httpMethod} ${evt.path}${this.queryMapToString(evt.queryStringParameters)} reqbody=${evt.body}`;
        console.log(msg);
        return null;
    }

    async postProcess(evt: RouterEvent, resp: RouterResponse): Promise<RouterResponse> {
        const msg = `${evt.httpMethod} ${evt.path}${this.queryMapToString(evt.queryStringParameters)} reqbody=${evt.body} status=${resp.statusCode || 200} respbody=${JSON.stringify(resp.body)}`;
        if (resp.statusCode >= 500) {
            console.error(msg);
        } else {
            console.log(msg);
        }
        return resp;
    }

    queryMapToString(queryStringParameters: {[key: string]: string} | null): string {
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
