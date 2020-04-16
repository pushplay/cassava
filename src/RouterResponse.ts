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
    headers?: { [key: string]: string };

    /**
     * Optional headers to set on the response but allowing multiple
     * values.
     */
    multiValueHeaders?: { [header: string]: string[] };

    /**
     * Optional cookies to set on the response.
     */
    cookies?: { [key: string]: string | RouterResponseCookie };

    /**
     * The body of the response, which will be stringified unless
     * `headers["Content-Type"]` is specified and not `"application/json"`
     * and the body is already a string.
     */
    body: any;
}

export interface RouterResponseCookie {
    value: string;
    options?: cookie.CookieSerializeOptions;
}

export namespace RouterResponse {
    export function getHeader(resp: RouterResponse, field: string): string | string[] | null {
        const fieldLower = field.toLowerCase();

        if (resp.multiValueHeaders) {
            for (const k of Object.keys(resp.multiValueHeaders)) {
                if (k.toLowerCase() === fieldLower) {
                    if (resp.multiValueHeaders[k].length === 1) {
                        return resp.multiValueHeaders[k][0];
                    } else {
                        return resp.multiValueHeaders[k];
                    }
                }
            }
        }

        if (resp.headers) {
            for (const k of Object.keys(resp.headers)) {
                if (k.toLowerCase() === fieldLower) {
                    return resp.headers[k];
                }
            }
        }

        return null;
    }

    export function setHeader(resp: RouterResponse, field: string, value: string): void {
        if (resp.multiValueHeaders?.[field]) {
            setMultiValueHeader(resp, field, [value]);
            return;
        }

        if (!resp.headers) {
            resp.headers = {};
        }

        const fieldLower = field.toLowerCase();
        for (const k of Object.keys(resp.headers)) {
            if (k.toLowerCase() === fieldLower) {
                setMultiValueHeader(resp, field, [resp.headers[k], value]);
                delete resp.headers[k];
                return;
            }
        }

        resp.headers[field] = value;
    }

    function setMultiValueHeader(resp: RouterResponse, field: string, value: string[]): void {
        if (!resp.multiValueHeaders) {
            resp.multiValueHeaders = {};
        }

        const fieldLower = field.toLowerCase();
        for (const k of Object.keys(resp.multiValueHeaders)) {
            if (k.toLowerCase() === fieldLower) {
                resp.multiValueHeaders[k].push(...value);
                return;
            }
        }

        resp.multiValueHeaders[field] = value;
    }
}
