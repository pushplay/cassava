import {Route} from "./Route";
import {RouterEvent} from "../RouterEvent";
import {RouterResponse} from "../RouterResponse";

export class BuildableRoute implements Route, RouteBuilder {

    private settings: {
        handler?: (evt: RouterEvent) => Promise<RouterResponse>;
        postProcessor?: (evt: RouterEvent, resp: RouterResponse) => Promise<RouterResponse>;
        pathString?: string;
        pathRegex?: RegExp;
        method?: string;
    } = {};

    matches(evt: RouterEvent): boolean {
        if (this.settings.method && this.settings.method !== evt.httpMethod) {
            return false;
        }
        if (this.settings.pathString && this.settings.pathString !== evt.path) {
            return false;
        }
        if (this.settings.pathRegex && !this.settings.pathRegex.test(evt.path)) {
            return false;
        }
        return true;
    }

    handle(evt: RouterEvent): Promise<RouterResponse> {
        if (this.settings.handler) {
            return this.settings.handler(evt);
        }
        return Promise.resolve(null);
    }

    postProcess(evt: RouterEvent, resp: RouterResponse): Promise<RouterResponse> {
        if (this.settings.postProcessor) {
            return this.settings.postProcessor(evt, resp);
        }
        return Promise.resolve(resp);
    }

    path(path: string|RegExp): this {
        if (!path) {
            throw new Error("path cannot be null");
        }
        if (this.settings.pathString || this.settings.pathRegex) {
            throw new Error("path is already defined");
        }
        if (typeof path === "string") {
            this.settings.pathString = path;
        } else if (path instanceof RegExp) {
            this.settings.pathRegex = path;
        } else {
            throw new Error("unknown path type");
        }
        return this;
    }

    method(method: string): this {
        if (!method) {
            throw new Error("method cannot be null");
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

    path(path: string | RegExp): this;
    method(method: string): this;
    handler(handler: (evt: RouterEvent) => Promise<RouterResponse>): this;
    postProcessor(postProcessor: (evt: RouterEvent, resp: RouterResponse) => Promise<RouterResponse>): this;

}
