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
}
