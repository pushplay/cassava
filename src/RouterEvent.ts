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
     * If the parameter is not set a RestError is thrown.
     */
    requireQueryStringParameter(param: string): this;

    /**
     * Require that the given query parameter is set and has
     * one of the given values.  If the parameter is not set or
     * does not take on one of the given values a RestError is thrown.
     */
    requireQueryStringParameter(param: string, values: string[], explanation?: string): this;

    /**
     * Require that the given query parameter is set and satisfies
     * the validator function.  If the parameter is not set or
     * does not satisfy the given validator function a RestError is thrown.
     */
    requireQueryStringParameter(param: string, validator: (value: string) => boolean, explanation?: string): this;

    requireQueryStringParameter(param: string, valuesOrValidator?: string[] | ((value: string) => boolean), explanation?: string): this {
        if (!this.queryStringParameters[param]) {
            throw new RestError(400, explanation || `Required query parameter '${param}' is not set.`);
        }
        if (valuesOrValidator && Array.isArray(valuesOrValidator) && valuesOrValidator.indexOf(this.queryStringParameters[param]) === -1) {
            throw new RestError(400, explanation || `Required query parameter '${param}=${this.queryStringParameters[param]}' must be one of: ${valuesOrValidator.join(", ")}.`);
        }
        if (valuesOrValidator && typeof valuesOrValidator === "function" && !valuesOrValidator(this.queryStringParameters[param])) {
            throw new RestError(400, explanation || `Required query parameter '${param}=${this.queryStringParameters[param]}' is not a legal value.`);
        }
        return this;
    }

    /**
     * Require that the given query parameters are *not* set.
     * If any parameter in this list is set a RestError is thrown.
     */
    blacklistQueryStringParameters(...params: string[]): void {
        blacklistKeys(this.queryStringParameters || {}, params, "query parameter");
    }

    /**
     * Require that only the given query parameters are set.  No parameter
     * in this list has to be set, but if any parameter is set that is not in
     * this list a RestError will be thrown.
     */
    whitelistStringQueryParameters(...params: string[]): void {
        whitelistKeys(this.queryStringParameters || {}, params, "query parameter");
    }

    /**
     * Require that the given header field is set.
     */
    requireHeader(field: string): this;

    /**
     * Require that the given header field is set and has
     * one of the given values.
     */
    requireHeader(field: string, values: string[], explanation?: string): this;

    /**
     * Require that the given header field is set and satisfies
     * the validator function.
     */
    requireHeader(field: string, validator: (value: string) => boolean, explanation?: string): this;

    requireHeader(field: string, valuesOrValidator?: string[] | ((value: string) => boolean), explanation?: string): this {
        const fieldLowerCase = field.toLowerCase();

        if (!this._headersLowerCase[fieldLowerCase]) {
            throw new RestError(400, explanation || `Required header '${field}' is not set.`);
        }
        if (valuesOrValidator && Array.isArray(valuesOrValidator) && valuesOrValidator.indexOf(this._headersLowerCase[fieldLowerCase]) === -1) {
            throw new RestError(400, explanation || `Required header '${field}=${this._headersLowerCase[fieldLowerCase]}' must be one of: ${valuesOrValidator.join(", ")}.`);
        }
        if (valuesOrValidator && typeof valuesOrValidator === "function" && !valuesOrValidator(this._headersLowerCase[fieldLowerCase])) {
            throw new RestError(400, explanation || `Required header '${field}=${this._headersLowerCase[fieldLowerCase]}' is not a legal value.`);
        }
        return this;
    }
}

function blacklistKeys(o: object, keys: string[], part: string = "member"): void {
    for (const key of Object.keys(o)) {
        if (keys.indexOf(key) !== -1) {
            throw new RestError(400, `Unexpected ${part} '${key}'.`);
        }
    }
}

function whitelistKeys(o: object, keys: string[], part: string = "member"): void {
    for (const key of Object.keys(o)) {
        if (keys.indexOf(key) === -1) {
            throw new RestError(400, `Unexpected ${part} '${key}'.`);
        }
    }
}
