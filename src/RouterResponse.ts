import * as cookie from "cookie";

/**
 * An HTTP response that will be processed into a proper AWS API Gateway
 * ProxyResponse by the Router.
 */
export interface RouterResponse {
    /**
     * The HTTP status code to respond with.  Defaults to 200.
     */
    statusCode?: number;

    /**
     * Optional headers to set on the response.
     */
    headers?: {[key: string]: string};

    /**
     * Optional cookies to set on the response.
     */
    cookies?: {[key: string]: string | RouterResponseCookie};

    /**
     * The body of the response.  Strings will be sent raw,
     * all other types will be JSON stringified.
     */
    body: any;
}

export interface RouterResponseCookie {
    value: string;
    options?: cookie.CookieSerializeOptions;
}
