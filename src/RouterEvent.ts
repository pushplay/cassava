/**
 * Input to the HTTP router.  Based on the ProxyEvent but enriched.
 */
import {RestError} from "./RestError";

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
    body: any;

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

    getHeader(header: string): string {
        return this._headersLowerCase[header.toLowerCase()];
    }

    /**
     * Require that the given query parameter is set.
     */
    requireQueryParam(param: string): this;

    /**
     * Require that the given query parameter is set and has
     * one of the given values.
     */
    requireQueryParam(param: string, values: string[], explanation?: string): this;

    /**
     * Require that the given query parameter is set and satisfies
     * the validator function.
     */
    requireQueryParam(param: string, validator: (value: string) => boolean, explanation?: string): this;

    requireQueryParam(param: string, valuesOrValidator?: string[] | ((value: string) => boolean), explanation?: string): this {
        if (!this.queryStringParameters[param]) {
            throw new RestError(400, explanation || `Required query parameter '${param}' is not set.`);
        }
        if (valuesOrValidator && Array.isArray(valuesOrValidator) && valuesOrValidator.indexOf(this.queryStringParameters[param]) === -1) {
            throw new RestError(400, explanation || `Required query parameter '${param}' must be one of: ${valuesOrValidator.join(", ")}.`);
        }
        if (valuesOrValidator && typeof valuesOrValidator === "function" && !valuesOrValidator(this.queryStringParameters[param])) {
            throw new RestError(400, explanation || `Required query parameter '${param}' is not a legal value.`);
        }
        return this;
    }
}
