import * as jsonschema from "jsonschema";
import {RestError} from "./RestError";

/**
 * Input to the HTTP router.  Based on the ProxyEvent but enriched.
 */
export class RouterEvent {

    /**
     * API Gateway event context.
     * @link https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
     */
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
     * All headers of the request.  They are stored here in their original
     * form but the spec requires that header keys are treated as case-insensitive.
     * Use `headersLowerCase` for easier retrieval.
     */
    headers: { [key: string]: string };

    /**
     * All headers of the request with keys in lower case.
     */
    headersLowerCase: { [key: string]: string };

    /**
     * GET, POST, PUT, etc...
     */
    httpMethod: string;

    /**
     * A work area for Routes to add properties to.  This can be used
     * to sneak information from routes that preprocess to later routes;
     * for example auth credentials.
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

    /**
     * Configuration attributes associated with a deployment stage of an API.
     */
    stageVariables: { [key: string]: string };

    /**
     * Require that the given query parameter is set.
     * If the parameter is not set a RestError is thrown.
     */
    requireQueryStringParameter(param: string): void;

    /**
     * Require that the given query parameter is set and has
     * one of the given values.  If the parameter is not set or
     * does not take on one of the given values a RestError is thrown.
     */
    requireQueryStringParameter(param: string, values: string[], explanation?: string): void;

    /**
     * Require that the given query parameter is set and satisfies
     * the validator function.  If the parameter is not set or
     * does not satisfy the given validator function a RestError is thrown.
     */
    requireQueryStringParameter(param: string, validator: (value: string) => boolean, explanation?: string): void;

    requireQueryStringParameter(param: string, valuesOrValidator?: string[] | ((value: string) => boolean), explanation?: string): void {
        if (!this.queryStringParameters[param]) {
            throw new RestError(400, explanation || `Required query parameter '${param}' is not set.`);
        }
        if (valuesOrValidator && Array.isArray(valuesOrValidator) && valuesOrValidator.indexOf(this.queryStringParameters[param]) === -1) {
            throw new RestError(400, explanation || `Required query parameter '${param}=${this.queryStringParameters[param]}' must be one of: ${valuesOrValidator.join(", ")}.`);
        }
        if (valuesOrValidator && typeof valuesOrValidator === "function" && !valuesOrValidator(this.queryStringParameters[param])) {
            throw new RestError(400, explanation || `Required query parameter '${param}=${this.queryStringParameters[param]}' is not a legal value.`);
        }
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
    whitelistQueryStringParameters(...params: string[]): void {
        whitelistKeys(this.queryStringParameters || {}, params, "query parameter");
    }

    /**
     * Require that the given header field is set.
     */
    requireHeader(field: string): void;

    /**
     * Require that the given header field is set and has
     * one of the given values.
     */
    requireHeader(field: string, values: string[], explanation?: string): void;

    /**
     * Require that the given header field is set and satisfies
     * the validator function.
     */
    requireHeader(field: string, validator: (value: string) => boolean, explanation?: string): void;

    requireHeader(field: string, valuesOrValidator?: string[] | ((value: string) => boolean), explanation?: string): void {
        const fieldLowerCase = field.toLowerCase();

        if (!this.headersLowerCase[fieldLowerCase]) {
            throw new RestError(400, explanation || `Required header '${field}' is not set.`);
        }
        if (valuesOrValidator && Array.isArray(valuesOrValidator) && valuesOrValidator.indexOf(this.headersLowerCase[fieldLowerCase]) === -1) {
            throw new RestError(400, explanation || `Required header '${field}=${this.headersLowerCase[fieldLowerCase]}' must be one of: ${valuesOrValidator.join(", ")}.`);
        }
        if (valuesOrValidator && typeof valuesOrValidator === "function" && !valuesOrValidator(this.headersLowerCase[fieldLowerCase])) {
            throw new RestError(400, explanation || `Required header '${field}=${this.headersLowerCase[fieldLowerCase]}' is not a legal value.`);
        }
    }

    /**
     * Validate the body of the request using JSON Schema.
     *
     * JSON Schema is a concise way to define a valid JSON object.
     * The spec and examples can be found at http://json-schema.org/
     * with additional help at
     * https://spacetelescope.github.io/understanding-json-schema/index.html .
     *
     * The actual implementation comes from https://github.com/tdegrunt/jsonschema .
     */
    validateBody(schema: jsonschema.Schema, options?: ValidateBodyOptions): void {
        const result = jsonschema.validate(this.body, schema, options);
        if (result.errors.length) {
            throw new RestError(
                options && typeof options.httpStatusCode === "number" ? options.httpStatusCode : 422,
                `The ${this.httpMethod} body has ${result.errors.length} validation error(s): ${result.errors.map(e => e.toString()).join(", ")}.`
            );
        }
    }
}

/**
 * RouterEvent.validateBody() options.  Extends jsonschema.validate() Options.
 */
export interface ValidateBodyOptions extends jsonschema.Options {
    /**
     * The HTTP status code to use for validation errors.  Defaults to 422.
     */
    httpStatusCode?: number;
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
