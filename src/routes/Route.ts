import {RouterResponse} from "../RouterResponse";
import {RouterEvent} from "../RouterEvent";

export interface Route {
    /**
     * Test whether this Route matches the ProxyEvent.
     */
    matches(evt: RouterEvent): boolean;

    /**
     * Handle and respond to the ProxyEvent.  Resolves
     * the Promise with null to not respond.
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
