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
import {httpStatusCode} from "./httpStatus";

export class Router {

    logErrors = true;
    readonly routes: Route[] = [];
    readonly defaultRoute = new DefaultRoute();

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

    /**
     * @deprecated Use route(route) instead.
     */
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
        return new RouterEvent(evt);
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
