import * as awslambda from "aws-lambda";
import * as cookieLib from "cookie";
import * as url from "url";
import {BuildableRoute, DefaultRoute, Route, RouteBuilder} from "./routes";
import {ProxyEvent} from "./ProxyEvent";
import {ProxyResponse, ProxyResponseCallback} from "./ProxyResponse";
import {RestError} from "./RestError";
import {RouterEvent} from "./RouterEvent";
import {RouterResponse} from "./RouterResponse";
import {httpStatusCode, httpStatusString} from "./httpStatus";

export class Router {

    /**
     * Routes that will be tested against in order.
     */
    readonly routes: Route[] = [];

    /**
     * The default route that will be matched if no other routes matched.
     *
     * The default implementation is to return a 404 response.
     */
    defaultRoute: Route = new DefaultRoute();

    /**
     * The handler that will be called when non-RestErrors are thrown.
     * The handler can return nothing, a RouterResponse, or a Promise that resolves
     * such.  If a RouterResponse or Promise of RouterResponse is returned that will
     * be the response used.
     *
     * The default implementation is to log the error.
     */
    errorHandler: (err: Error) => Promise<RouterResponse | null | void> | RouterResponse | null | void
        = err => console.log("Error thrown during execution.\n", err);

    /**
     * Start a BuildableRoute with the given string or regex path.
     */
    route(path?: string | RegExp): RouteBuilder;

    /**
     * Add a custom Route.
     */
    route<T extends Route>(route: T): T;

    route(path?: string | RegExp | Route): RouteBuilder | Route {
        if (!path) {
            const route = new BuildableRoute();
            this.routes.push(route);
            return route;
        } else if (typeof path === "string" || path instanceof RegExp) {
            const route = new BuildableRoute();
            route.path(path);
            this.routes.push(route);
            return route;
        } else if (path.matches && (path.handle || path.postProcess)) {
            this.routes.push(path);
            return path;
        }

        throw new Error("Input must be a string or regex to create a new RouteBuilder, or an instance of Route.");
    }

    getLambdaHandler(): (evt: ProxyEvent, ctx: awslambda.Context, callback: ProxyResponseCallback) => void {
        return (evt: ProxyEvent, ctx: awslambda.Context, callback: ProxyResponseCallback) => {
            this.routeProxyEvent(evt)
                .then(res => {
                    callback(undefined, res);
                }, err => {
                    console.error("Catastrophic error thrown during execution.\n", err);
                    callback(err);
                });
        };
    }

    private async routeProxyEvent(pevt: ProxyEvent): Promise<ProxyResponse> {
        // Non-functional programming for speeeeed.

        const evt = this.proxyEventToRouterEvent(pevt);
        let resp: RouterResponse | void = null;
        const postProcessors: Route[] = [];

        for (let routeIx = 0; routeIx < this.routes.length && !resp; routeIx++) {
            const route = this.routes[routeIx];
            if (route.matches(evt)) {
                if (route.postProcess) {
                    postProcessors.push(route);
                }
                if (route.handle) {
                    try {
                        resp = await route.handle(evt);
                    } catch (err) {
                        resp = await this.errorToRouterResponse(err);
                    }
                }
            }
        }
        if (!resp) {
            try {
                if (!this.defaultRoute.handle) {
                    throw new Error("Router's defaultRoute.handle is not defined.");
                }
                resp = await this.defaultRoute.handle(evt);
                if (!resp) {
                    throw new Error("Router's defaultRoute.handle() did not return a response.");
                }
            } catch (err) {
                resp = await this.errorToRouterResponse(err);
            }
        }

        while (postProcessors.length) {
            const route = postProcessors.pop();
            try {
                resp = await route.postProcess(evt, resp) || resp;
            } catch (err) {
                resp = await this.errorToRouterResponse(err);
            }
        }

        return this.routerResponseToProxyResponse(resp);
    }

    private proxyEventToRouterEvent(evt: ProxyEvent): RouterEvent {
        const r = new RouterEvent();

        r.context = evt.context;
        r.headers = evt.headers || {};
        r.httpMethod = evt.httpMethod;
        r.meta = {};
        r.path = this.proxyPathToRouterPath(evt.path);
        r.queryStringParameters = evt.queryStringParameters || {};
        r.pathParameters = evt.pathParameters || {};
        r.stageVariables = evt.stageVariables || {};

        r.headersLowerCase = {};
        for (const headerKey of Object.keys(r.headers)) {
            r.headersLowerCase[headerKey.toLowerCase()] = r.headers[headerKey];
        }

        if (typeof evt.body === "string" && (!r.headersLowerCase["content-type"] || /(application|text)\/(x-)?json/.test(r.headersLowerCase["content-type"]))) {
            try {
                if ((evt as ProxyEvent).isBase64Encoded) {
                    r.body = JSON.parse(Buffer.from(evt.body, "base64").toString());
                } else {
                    r.body = JSON.parse(evt.body);
                }
            } catch (e) {
                throw new RestError(httpStatusCode.clientError.BAD_REQUEST, `Unable to parse JSON body: ${e.message}`);
            }
        } else {
            r.body = evt.body;
        }

        r.cookies = {};
        if (r.headersLowerCase["cookie"]) {
            try {
                r.cookies = cookieLib.parse(r.headersLowerCase["cookie"]);
            } catch (e) {
                throw new RestError(httpStatusCode.clientError.BAD_REQUEST, `Unable to parse cookies: ${e.message}`);
            }
        }

        return r;
    }

    private proxyPathToRouterPath(path: string): string {
        if (url.URL) {
            // This constructor was added in Node v6.13.0.
            return new url.URL(path, "http://host/").pathname.replace(/\/\/+/g, "/");
        } else if (url.parse) {
            // This method was deprecated in Node v6.13.0.
            return url.parse(path).pathname.replace(/\/\/+/g, "/");
        } else {
            throw new Error("No suitable URL parsing method in the 'url' package found.");
        }
    }

    private async errorToRouterResponse(err: Error): Promise<RouterResponse> {
        if (err && (err as RestError).isRestError) {
            return {
                statusCode: (err as RestError).statusCode,
                body: {
                    message: err.message,
                    statusCode: (err as RestError).statusCode,
                    ...(err as RestError).additionalParams
                }
            };
        }

        if (this.errorHandler) {
            const resp = await this.errorHandler(err);
            if (resp) {
                return resp;
            }
        }

        return {
            statusCode: httpStatusCode.serverError.INTERNAL_SERVER_ERROR,
            body: {
                message: httpStatusString[httpStatusCode.serverError.INTERNAL_SERVER_ERROR],
                statusCode: httpStatusCode.serverError.INTERNAL_SERVER_ERROR
            }
        };
    }

    private routerResponseToProxyResponse(resp: RouterResponse): ProxyResponse {
        if (resp.cookies) {
            const cookieKeys = Object.keys(resp.cookies);
            for (let i = 0, length = cookieKeys.length; i < length; i++) {
                const key = cookieKeys[i];
                const value = resp.cookies[key];
                const cookieString = typeof value === "string" ? cookieLib.serialize(key, value) : cookieLib.serialize(key, value.value, value.options);
                const setCookie = RouterResponse.getHeader(resp, "Set-Cookie");
                if (setCookie) {
                    RouterResponse.setHeader(resp, "Set-Cookie", `${setCookie}; ${cookieString}`);
                } else {
                    RouterResponse.setHeader(resp, "Set-Cookie", cookieString);
                }
            }
        }

        let isBase64Encoded = false;
        let body: string;
        const contentType = RouterResponse.getHeader(resp, "Content-Type");
        if (resp.body instanceof Buffer) {
            body = resp.body.toString("base64");
            isBase64Encoded = true;
        } else if (!contentType) {
            // Automatic serialization to JSON if Content-Type is not set.
            body = JSON.stringify(resp.body);
            RouterResponse.setHeader(resp, "Content-Type", "application/json");
        } else {
            body = resp.body;
        }

        return {
            statusCode: resp.statusCode || httpStatusCode.success.OK,
            headers: resp.headers || {},
            body,
            isBase64Encoded
        };
    }
}
