import {RouterResponse} from "../RouterResponse";
import {RouterEvent} from "../RouterEvent";

export interface Route {
    /**
     * Test whether this Route matches the ProxyEvent. If `true` `handle()`
     * and `postProcess()` will be called (if defined).
     */
    matches(evt: RouterEvent): boolean;

    /**
     * Handle and respond to the ProxyEvent.
     *
     * Return a RouterResponse object or a Promise that resoles to a RouterResponse
     * object to handle the event.
     *
     * Return null or resolve the Promise with null to not respond and let
     * other Routes handle it.  `postProcess()` will still be called in that case.
     */
    handle?: (evt: RouterEvent) => Promise<RouterResponse | null | void> | RouterResponse | null | void;

    /**
     * Post-process the response before it is sent.
     *
     * Return a RouterResponse object or a Promise that resolves to a RouterResponse
     * object to change the response.  Modifying the object in place will
     * also change the response.
     */
    postProcess?: (evt: RouterEvent, resp: RouterResponse, handlingRoutes: Route[]) => Promise<RouterResponse | null | void> | RouterResponse | null | void;

    /**
     * Whether the route is enabled.  Set to `false` to disable.
     */
    enabled?: boolean;
}
