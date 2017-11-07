import {Route} from "./Route";
import {RouterEvent} from "../RouterEvent";
import {RouterResponse} from "../RouterResponse";

export class BuildableRoute implements Route, RouteBuilder {

    private settings: {
        handler?: (evt: RouterEvent) => Promise<RouterResponse>;
        postProcessor?: (evt: RouterEvent, resp: RouterResponse) => Promise<RouterResponse>;
        pathRegex?: RegExp;
        regexGroupToPathParamMap?: string[],
        method?: string;
    } = {};

    matches(evt: RouterEvent): boolean {
        if (this.settings.method && this.settings.method !== evt.httpMethod) {
            return false;
        }
        if (this.settings.pathRegex && !this.settings.pathRegex.test(evt.path)) {
            return false;
        }
        return true;
    }

    handle(evt: RouterEvent): Promise<RouterResponse> | null {
        if (this.settings.handler) {
            const calculatedPathParameters = {...evt.pathParameters};

            // Map regex groups to pathParameters.
            const pathRegexExec = this.settings.pathRegex.exec(evt.path);
            for (let i = 1; i < pathRegexExec.length; i++) {
                const pathValue = decodeURIComponent(pathRegexExec[i]);
                if (this.settings.regexGroupToPathParamMap && this.settings.regexGroupToPathParamMap[i]) {
                    calculatedPathParameters[this.settings.regexGroupToPathParamMap[i]] = pathValue;
                }
                calculatedPathParameters[i.toString()] = pathValue;
            }

            const pathedRouterEvent = Object.assign(new RouterEvent(), evt);
            pathedRouterEvent.pathParameters = calculatedPathParameters;
            return this.settings.handler(pathedRouterEvent);
        }
        return null;
    }

    postProcess(evt: RouterEvent, resp: RouterResponse): Promise<RouterResponse> | null {
        if (this.settings.postProcessor) {
            return this.settings.postProcessor(evt, resp);
        }
        return null;
    }

    path(path: string | RegExp): this {
        if (!path) {
            throw new Error("path cannot be null");
        }
        if (this.settings.pathRegex) {
            throw new Error("path is already defined");
        }

        if (typeof path === "string") {
            // Turn path into a regex, replace {pathParam}s with regex groups
            // and build the map that maps the group index to the path param name.
            this.settings.regexGroupToPathParamMap = [""];
            const sanitizedPathRegex = path
                .replace(/[#-.]|[[-^]|[?|{}]/g, "\\$&")
                .replace(/\\\{[a-zA-Z][a-zA-Z0-9]*\\\}/g, substr => {
                    const pathParamName = substr.replace(/^\\\{/, "").replace(/\\\}/, "");
                    this.settings.regexGroupToPathParamMap.push(pathParamName);
                    return "([0-9a-zA-Z\-._~!$&'()*+,;=:@%]+)";
                });

            path = new RegExp(`^${sanitizedPathRegex}$`, "i");
        }

        if (path instanceof RegExp) {
            this.settings.pathRegex = path;
        } else {
            throw new Error("unknown path type");
        }

        return this;
    }

    method(method: string): this {
        if (!method) {
            throw new Error("method must be set");
        }
        if (this.settings.method) {
            throw new Error("method is already defined");
        }
        this.settings.method = method;
        return this;
    }

    handler(handler: (evt: RouterEvent) => Promise<RouterResponse>): this {
        if (!handler) {
            throw new Error("handler cannot be null");
        }
        if (this.settings.handler) {
            throw new Error("handler is already defined");
        }
        this.settings.handler = handler;
        return this;
    }

    postProcessor(postProcessor: (evt: RouterEvent, resp: RouterResponse) => Promise<RouterResponse>): this {
        if (!postProcessor) {
            throw new Error("postProcessor cannot be null");
        }
        if (this.settings.postProcessor) {
            throw new Error("postProcessor is already defined");
        }
        this.settings.postProcessor = postProcessor;
        return this;
    }
}

export interface RouteBuilder {

    /**
     * Match requests with the given path.
     */
    path(path: string | RegExp): this;

    /**
     * Match requests for the given method.
     */
    method(method: string): this;

    /**
     * Set the handler for this Route.
     */
    handler(handler: (evt: RouterEvent) => Promise<RouterResponse | null | void> | RouterResponse | null | void): this;

    /**
     * Set the post processor for this Route.
     */
    postProcessor(postProcessor: (evt: RouterEvent, resp: RouterResponse) => Promise<RouterResponse | null | void> | RouterResponse | null | void): this;

}
