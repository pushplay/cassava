import * as http from "http";
import * as https from "https";
import * as querystring from "querystring";
import * as url from "url";
import {Route} from "./Route";
import {RouterEvent} from "../RouterEvent";
import {RouterResponse} from "../RouterResponse";

/**
 * Proxies requests to another server.
 */
export class ProxyRoute implements Route {

    private parsedDest: url.UrlObjectCommon;

    constructor(public readonly config: ProxyRouteConfig) {
        if (!config) {
            throw new Error("config must be set");
        }
        if (typeof config.srcPath !== "string") {
            throw new Error("config.srcPath must be set");
        }
        if (!config.srcPath.startsWith("/")) {
            throw new Error("config.srcPath must start with `/`");
        }
        if (config.srcPath.includes("?") || config.srcPath.includes("#")) {
            throw new Error("config.srcPath cannot define a query or hash");
        }
        if (typeof config.destPath !== "string") {
            throw new Error("config.destPath must be set");
        }
        if (!config.destPath.match(/^https?:\/\//)) {
            throw new Error("config.destPath must start with http:// or https://");
        }
        if (config.destPath.includes("?") || config.destPath.includes("#")) {
            throw new Error("config.destPath cannot define a query or hash");
        }

        this.parsedDest = url.parse ? url.parse(config.destPath) : new url.URL(config.destPath);
    }

    matches(evt: RouterEvent): boolean {
        return evt.path.startsWith(this.config.srcPath) && (evt.path.length === this.config.srcPath.length || this.config.srcPath.endsWith("/") || evt.path[this.config.srcPath.length] === "/");
    }

    async handle(evt: RouterEvent): Promise<RouterResponse | null> {
        let reqArgs: http.ClientRequestArgs = {
            protocol: this.parsedDest.protocol,
            hostname: this.parsedDest.hostname,
            method: evt.httpMethod,
            headers: {...evt.headers, ...this.config.additionalHeaders},
            path: this.parsedDest.path + evt.path.substr(this.config.srcPath.length)
        };
        if (evt.multiValueQueryStringParameters) {
            const q = querystring.stringify(evt.multiValueQueryStringParameters);
            if (q.length) {
                reqArgs.path += "?" + q;
            }
        }
        if (this.config.requestMapper) {
            reqArgs = await this.config.requestMapper(reqArgs);
            if (!reqArgs) {
                return null;
            }
        }

        let body = evt.body;
        if (body && this.config.bodyMapper) {
            body = await this.config.bodyMapper(body);
        }
        let bodyContentType = body && this.getRequestBodyContentType(reqArgs);
        if (body && !bodyContentType) {
            bodyContentType = reqArgs.headers["Content-Type"] = "application/json";
        }

        // Do this manually so as to not create another dependency.
        return new Promise<RouterResponse>((resolve, reject) => {
            const reqFunction = reqArgs.protocol === "http:" ? http.request : https.request;
            const req = reqFunction(reqArgs, res => {
                const response: RouterResponse = {
                    statusCode: res.statusCode,
                    headers: res.headers as { [h: string]: string },
                    body: ""
                };

                res.on("data", d => response.body += d);
                res.on("end", () => resolve(response));
            });

            req.on("error", e => reject(e));

            if (body !== undefined) {
                if (typeof body === "string" && !bodyContentType.match(/json$/)) {
                    req.write(body);
                } else {
                    req.write(JSON.stringify(body));
                }
            }

            req.end();
        });
    }

    private getRequestBodyContentType(reqArgs: http.ClientRequestArgs): string {
        for (const header of Object.keys(reqArgs.headers)) {
            if (header.toLowerCase() === "content-type") {
                return reqArgs.headers[header] as string;
            }
        }
        return null;
    }
}

export interface ProxyRouteConfig {

    /**
     * The root of the REST path to start proxying.
     */
    srcPath: string;

    /**
     * The destination to proxy to.
     */
    destPath: string;

    /**
     * Optional additional headers to send with the request.
     */
    additionalHeaders?: { [key: string]: string };

    /**
     * Optional mapper function to alter the ClientRequestArgs before sending it.  Can return
     * the altered ClientRequestArgs or a Promise resolving to a ClientRequestArgs to
     * continue with the request.  Can return `null` or a Promise resolving to `null` to
     * cancel the request.
     */
    requestMapper?: (reqArgs: http.ClientRequestArgs) => Promise<http.ClientRequestArgs | null> | http.ClientRequestArgs | null;

    /**
     * Optional mapper function to alter the request body (if any) before sending the request.
     * Can return `undefined` to not send a body.
     */
    bodyMapper?: (reqBody: any) => Promise<any> | any;
}
