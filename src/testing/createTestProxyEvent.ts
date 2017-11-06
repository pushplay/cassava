import * as querystring from "querystring";
import * as uuid from "uuid/v4";
import {URL} from "url";
import {ProxyEvent} from "../ProxyEvent";

const randomableCharacters: string = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomString(length: number): string {
    let text = "";
    for (let i = 0; i < length; i++) {
        text += randomableCharacters.charAt(Math.floor(Math.random() * randomableCharacters.length));
    }
    return text;
}

const defaultTestProxyEvent: ProxyEvent = {
    resource: "/{proxy+}",
    path: "/",
    httpMethod: "GET",
    headers: null,
    queryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    context: {
        accountId: "12345678912",
        resourceId: randomString(6),
        stage: "testStage",
        requestId: "",
        identity: {
            accessKey: "abcdefg",
            cognitoIdentityPoolId: null,
            accountId: null,
            caller: null,
            apiKey: null,
            sourceIp: "192.168.0.0",
            cognitoAuthenticationType: null,
            cognitoAuthenticationProvider: null,
            userArn: null,
            userAgent: "PostmanRuntime/2.4.5",
            user: null
        },
        resourcePath: "/{proxy+}",
        httpMethod: "GET",
        apiId: randomString(10)
    },
    body: null,
    isBase64Encoded: false
};

/**
 * Create a fake ProxyEvent object that can be passed into the handler returned
 * from getLambdaHandler().
 */
export function createTestProxyEvent(url: string = "/", method: string = "GET", overrides: Partial<ProxyEvent> = {}): ProxyEvent {
    const heavyUrl = new URL(url, "https://example.org/");

    return {
        ...defaultTestProxyEvent,
        ...overrides,
        context: {
            ...defaultTestProxyEvent.context,
            ...overrides.context ? overrides.context : {},
            httpMethod: method,
            requestId: uuid()
        },
        httpMethod: method,
        path: heavyUrl.pathname,
        queryStringParameters: deduplicateQueryStringParameters(heavyUrl.search ? querystring.parse(heavyUrl.search.substring(1)) : null)
    };
}

/**
 * Turn a query params object that allows for duplicate query string values into one that doesn't.
 * see: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-known-issues.html
 */
function deduplicateQueryStringParameters(params: { [key: string]: string | string[] }): { [key: string]: string } {
    if (!params) {
        return null;
    }

    const queryStringParameters: { [key: string]: string } = {};
    for (const key in params) {
        const value = params[key];
        if (Array.isArray(value)) {
            queryStringParameters[key] = value[value.length - 1];
        } else {
            queryStringParameters[key] = value;
        }
    }
    return queryStringParameters;
}
