import * as awslambda from "aws-lambda";
import * as cookieLib from "cookie";
import {DefaultRoute} from "./routes/DefaultRoute";
import {ProxyEvent} from "./ProxyEvent";
import {ProxyResponse, ProxyResponseCallback} from "./ProxyResponse";
import {RestError} from "./RestError";
import {Route} from "./routes/Route";
import {BuildableRoute, RouteBuilder} from "./routes/BuildableRoute";
import {RouterEvent} from "./RouterEvent";
import {RouterResponse} from "./RouterResponse";
import {httpStatusCode, httpStatusString} from "./httpStatus";

export class Router {

    logErrors = true;

    /**
     * Routes that will be tested against in order.
     */
    readonly routes: Route[] = [];

    /**
     * The default route that will be matched if no other routes matched.
     */
    defaultRoute = new DefaultRoute();

    /**
     * The default error that will be shown when a plain Error is thrown.
     */
    defaultError = new RestError();

    route(path?: string | RegExp): RouteBuilder;
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
                    this.logErrors && console.log("Error thrown during execution.\n", err);
                    callback(undefined, this.routerResponseToProxyResponse(this.errorToRouterResponse(this.defaultError)));
                });
        };
    }

    private async routeProxyEvent(pevt: ProxyEvent): Promise<ProxyResponse> {
        // Non-functional programming for speeeeed.

        const evt = this.proxyEventToRouterEvent(pevt);
        let resp: RouterResponse;
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
                        if ((err as RestError).isRestError) {
                            resp = this.errorToRouterResponse(err);
                        } else {
                            throw err;
                        }
                    }
                }
            }
        }
        if (!resp) {
            try {
                resp = await this.defaultRoute.handle(evt);
            } catch (err) {
                if ((err as RestError).isRestError) {
                    resp = this.errorToRouterResponse(err);
                } else {
                    throw err;
                }
            }
        }

        while (postProcessors.length) {
            const route = postProcessors.pop();
            try {
                resp = await route.postProcess(evt, resp) || resp;
            } catch (err) {
                if ((err as RestError).isRestError) {
                    resp = this.errorToRouterResponse(err);
                } else {
                    throw err;
                }
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
        r.path = evt.path;
        r.queryStringParameters = evt.queryStringParameters || {};
        r.pathParameters = evt.pathParameters || {};
        r.stageVariables = evt.stageVariables || {};

        r._headersLowerCase = {};
        for (const headerKey of Object.keys(r.headers)) {
            r._headersLowerCase[headerKey.toLowerCase()] = r.headers[headerKey];
        }

        if (typeof evt.body === "string" && (!r._headersLowerCase["content-type"] || /(application|text)\/(x-)?json/.test(r._headersLowerCase["content-type"]))) {
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
        if (r._headersLowerCase["cookie"]) {
            try {
                r.cookies = cookieLib.parse(r._headersLowerCase["cookie"]);
            } catch (e) {
                throw new RestError(httpStatusCode.clientError.BAD_REQUEST, `Unable to parse cookies: ${e.message}`);
            }
        }

        return r;
    }

    private errorToRouterResponse(err: Error): RouterResponse {
        if (err && (err as RestError).isRestError) {
            return {
                statusCode: (err as RestError).statusCode,
                body: {
                    message: err.message,
                    statusCode: (err as RestError).statusCode
                }
            };
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
                const setCookie = this.getResponseHeader(resp, "Set-Cookie");
                if (setCookie) {
                    this.setResponseHeader(resp, "Set-Cookie", `${setCookie}; ${cookieString}`);
                } else {
                    this.setResponseHeader(resp, "Set-Cookie", cookieString);
                }
            }
        }

        return {
            statusCode: resp.statusCode || httpStatusCode.success.OK,
            headers: resp.headers || {},
            body: this.shouldStringifyResponseBody(resp) ? JSON.stringify(resp.body) : resp.body
        };
    }

    private shouldStringifyResponseBody(resp: RouterResponse): boolean {
        const contentType = this.getResponseHeader(resp, "Content-Type");
        return typeof resp.body !== "string" || !contentType || contentType === "application/json" || contentType === "text/json" || contentType === "text/x-json";
    }

    private getResponseHeader(resp: RouterResponse, field: string): string {
        if (!resp.headers) {
            return null;
        }

        const fieldLower = field.toLowerCase();
        for (const k of Object.keys(resp.headers)) {
            if (k.toLowerCase() === fieldLower) {
                return resp.headers[k];
            }
        }

        return null;
    }

    private setResponseHeader(resp: RouterResponse, field: string, value: string): string {
        if (!resp.headers) {
            resp.headers = {};
        }

        const fieldLower = field.toLowerCase();
        for (const k of Object.keys(resp.headers)) {
            if (k.toLowerCase() === fieldLower) {
                resp.headers[k] = value;
                return;
            }
        }

        resp.headers[field] = value;
    }
}
