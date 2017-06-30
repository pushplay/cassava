import * as cookieLib from "cookie";
import {ProxyEvent} from "./ProxyEvent";
import {RestError} from "./RestError";
import {httpStatusCode} from "./httpStatus";

/**
 * Input to the HTTP router.  Based on the ProxyEvent but enriched.
 */
export class RouterEvent {

    context: {
        accountId: string,
        apiId: string,
        httpMethod: string,
        identity: {
            accessKey: string,
            apiKey: string,
            accountId: string,
            caller: string,
            cognitoAuthenticationProvider: string,
            cognitoAuthenticationType: string,
            cognitoIdentityPoolId: string,
            sourceIp: string,
            user: string,
            userAgent: string,
            userArn: string
        },
        requestId: string,
        resourceId: string,
        resourcePath: string,
        stage: string
    };

    /**
     * Parsed Cookie header.
     */
    cookies: { [name: string]: string };

    /**
     * Request body (JSON.parsed if possible).
     */
    body: object | string | null;

    /**
     * All headers of the request.  Header keys are case-insensitive.
     * Use getHeader() for case-insensitive lookup.
     */
    headers: { [key: string]: string };

    /**
     * All headers of the request in lowercase keys.  Use getHeader()
     * instead for convenience.
     */
    _headersLowerCase: { [key: string]: string };

    /**
     * GET, POST, PUT, etc...
     */
    httpMethod: string;

    /**
     * A work area for Routes to add properties to.
     */
    meta: { [name: string]: any };

    /**
     * The request URI path.  eg: /foo/bar
     */
    path: string;

    /**
     * The parsed URI path parameters.
     */
    pathParameters: { [key: string]: string };

    /**
     * The parsed URI query parameters.
     */
    queryStringParameters: { [key: string]: string };

    stageVariables: { [key: string]: string };

    constructor(evt: ProxyEvent | RouterEvent) {
        this.context = evt.context;
        this.headers = evt.headers || {};
        this.httpMethod = evt.httpMethod;
        this.meta = (evt as RouterEvent).meta || {};
        this.path = evt.path;
        this.queryStringParameters = evt.queryStringParameters || {};
        this.pathParameters = evt.pathParameters || {};
        this.stageVariables = evt.stageVariables || {};

        if ((evt as RouterEvent)._headersLowerCase) {
            this._headersLowerCase = (evt as RouterEvent)._headersLowerCase;
        } else {
            this._headersLowerCase = {};
            for (const headerKey of Object.keys(this.headers)) {
                this._headersLowerCase[headerKey.toLowerCase()] = this.headers[headerKey];
            }
        }

        if (typeof evt.body === "string" && (!this._headersLowerCase["content-type"] || /(application|text)\/(x-)?json/.test(this._headersLowerCase["content-type"]))) {
            try {
                if ((evt as ProxyEvent).isBase64Encoded) {
                    this.body = JSON.parse(Buffer.from(evt.body, "base64").toString())
                } else {
                    this.body = JSON.parse(evt.body);
                }
            } catch (e) {
                throw new RestError(httpStatusCode.clientError.BAD_REQUEST, `Unable to parse JSON body: ${e.message}`);
            }
        } else {
            this.body = evt.body;
        }

        if ((evt as RouterEvent).cookies) {
            this.cookies = (evt as RouterEvent).cookies;
        } else {
            this.cookies = {};
            if (this._headersLowerCase["cookie"]) {
                try {
                    this.cookies = cookieLib.parse(this._headersLowerCase["cookie"]);
                } catch (e) {
                    throw new RestError(httpStatusCode.clientError.BAD_REQUEST, `Unable to parse cookies: ${e.message}`);
                }
            }
        }
    }

    getHeader(header: string): string {
        return this._headersLowerCase[header.toLowerCase()];
    }
}
