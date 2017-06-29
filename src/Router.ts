import * as awslambda from "aws-lambda";
import * as cookieLib from "cookie";
import {DefaultRoute} from "./routes/DefaultRoute";
import {ProxyEvent} from "./ProxyEvent";
import {ProxyResponseCallback, ProxyResponse} from "./ProxyResponse";
import {RestError} from "./RestError";
import {Route} from "./routes/Route";
import {RouteBuilder, BuildableRoute} from "./routes/BuildableRoute";
import {RouterEvent} from "./RouterEvent";
import {RouterResponse} from "./RouterResponse";
import {httpStatusCode} from "./httpStatus";

export class Router {

    logErrors = true;
    readonly routes: Route[] = [];
    readonly defaultRoute = new DefaultRoute();

    route(path?: string | RegExp): RouteBuilder {
        const route = new BuildableRoute();
        if (path) {
            route.path(path);
        }
        this.routes.push(route);
        return route;
    }

    addCustomRoute(route: Route): void {
        if (!route) {
            throw new Error("route cannot be null");
        }
        if (!route.matches) {
            throw new Error("route must have a matches() function");
        }
        if (!route.handle && !route.postProcess) {
            throw new Error("route must have a handle() and/or postProcess() function");
        }
        this.routes.push(route);
    }

    getLambdaHandler(): (evt: ProxyEvent, ctx: awslambda.Context, callback: ProxyResponseCallback) => void {
        return (evt: ProxyEvent, ctx: awslambda.Context, callback: ProxyResponseCallback) => {
            this.routeProxyEvent(evt)
                .then(res => {
                    callback(undefined, res);
                }, err => {
                    this.logErrors && console.log("Error thrown during execution.\n", err);
                    callback(null, {
                        statusCode: err.statusCode || httpStatusCode.serverError.INTERNAL_SERVER_ERROR,
                        headers: {},
                        body: RestError.stringify(err)
                    });
                });
        };
    }

    private async routeProxyEvent(pevt: ProxyEvent): Promise<ProxyResponse> {
        // Non-functional programming for speeeeed.

        const evt = this.proxyEventToRouterEvent(pevt);
        let resp: RouterResponse;
        const postProcessors: Route[] = [];

        for (let routeIx = 0; routeIx < this.routes.length; routeIx++) {
            const route = this.routes[routeIx];
            if (route.matches(evt)) {
                if (route.postProcess) {
                    postProcessors.push(route);
                }
                if (route.handle) {
                    try {
                        resp = await route.handle(evt);
                        if (resp) {
                            break;
                        }
                    } catch (err) {
                        if (err instanceof RestError) {
                            resp = {
                                statusCode: err.statusCode || httpStatusCode.serverError.INTERNAL_SERVER_ERROR,
                                headers: {},
                                body: RestError.stringify(err)
                            };
                            break;
                        } else {
                            throw err;
                        }
                    }
                }
            }
        }
        if (!resp) {
            resp = await this.defaultRoute.handle(evt);
        }

        while (postProcessors.length) {
            const route = postProcessors.pop();
            resp = await route.postProcess(evt, resp) || resp;
        }

        return this.routerResponseToProxyResponse(resp);
    }

    private proxyEventToRouterEvent(evt: ProxyEvent): RouterEvent {
        let bodyParsed: any = null;
        if (evt.body) {
            try {
                bodyParsed = JSON.parse(evt.body);
            } catch (e) {
                this.logErrors && console.log("error parsing body", e);
            }
        }

        const headersLowerCase: {[key: string]: string} = {};
        if (evt.headers) {
            const headerKeys = Object.keys(evt.headers);
            for (let i = 0, length = headerKeys.length; i < length; i++) {
                const key = headerKeys[i];
                headersLowerCase[key.toLowerCase()] = evt.headers[key];
            }
        }

        let cookies: {[key: string]: string} = {};
        if (headersLowerCase["cookie"]) {
            try {
                cookies = cookieLib.parse(headersLowerCase["cookie"]);
            } catch (e) {
                this.logErrors && console.log("error parsing cookies", e);
            }
        }

        return {
            bodyParsed: bodyParsed,
            cookies: cookies,
            headersLowerCase: headersLowerCase,
            meta: {},
            ... evt
        };
    }

    private routerResponseToProxyResponse(resp: RouterResponse): ProxyResponse {
        const headers = resp.headers || {};

        if (resp.cookies) {
            const cookieKeys = Object.keys(resp.cookies);
            for (let i = 0, length = cookieKeys.length; i < length; i++) {
                const key = cookieKeys[i];
                const value = resp.cookies[key];
                const cookieString = typeof value === "string" ? cookieLib.serialize(key, value) : cookieLib.serialize(key, value.value, value.options);
                if (headers["Set-Cookie"] && headers["Set-Cookie"].length) {
                    headers["Set-Cookie"] += "; " + cookieString;
                } else {
                    headers["Set-Cookie"] = cookieString;
                }
            }
        }

        return {
            statusCode: resp.statusCode || httpStatusCode.success.OK,
            headers: headers,
            body: typeof resp.body === "string" ? resp.body : JSON.stringify(resp.body)
        };
    }
}
