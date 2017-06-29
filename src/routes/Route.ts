import {RouterResponse} from "../RouterResponse";
import {RouterEvent} from "../RouterEvent";

export interface Route {
    /**
     * Test whether this Route matches the ProxyEvent. If true handle()
     * and postProcess() will be called.
     */
    matches(evt: RouterEvent): boolean;

    /**
     * Handle and respond to the ProxyEvent.
     *
     * Resolve the Promise with null to not respond and let other Routes
     * handle it.  postProcess() will still be called in that case.
     */
    handle?: (evt: RouterEvent) => Promise<RouterResponse>;

    /**
     * Post-process the response before it is sent.
     */
    postProcess?: (evt: RouterEvent, resp: RouterResponse) => Promise<RouterResponse>;

    /**
     * Whether the route is enabled.
     */
    enabled?: boolean;
}
