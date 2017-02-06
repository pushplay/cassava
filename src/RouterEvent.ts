import {ProxyEvent} from "./ProxyEvent";

/**
 * Input to the HTTP router.  Based on the ProxyEvent but enriched.
 */
export interface RouterEvent extends ProxyEvent {

    /**
     * JSON.parsed() body (if possible).
     */
    bodyParsed: any | null;

    /**
     * Parsed Cookie header.
     */
    cookies: {[name: string]: string};

    /**
     * All of the values of headers with lower case keys.
     * This is useful because header keys are case-insensitive.
     */
    headersLowerCase: {[key: string]: string};

    /**
     * A work area for Routes to add properties to.
     */
    meta: {[name: string]: any};

}
