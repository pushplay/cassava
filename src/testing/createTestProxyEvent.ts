import * as querystring from "querystring";
import * as uuid from "uuid";
import {URL} from "url";
import {ProxyEvent} from "../ProxyEvent";

const randomableCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomString(length: number): string {
    let text = "";
    for (let i = 0; i < length; i++) {
        text += randomableCharacters.charAt(Math.floor(Math.random() * randomableCharacters.length));
    }
    return text;
}

const defaultTestProxyEvent: ProxyEvent = {
    body: null,
    headers: {
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "CloudFront-Forwarded-Proto": "https",
        "CloudFront-Is-Desktop-Viewer": "true",
        "CloudFront-Is-Mobile-Viewer": "false",
        "CloudFront-Is-SmartTV-Viewer": "false",
        "CloudFront-Is-Tablet-Viewer": "false",
        "CloudFront-Viewer-Country": "US",
        "Content-Type": "application/json",
        DNT: "1",
        Host: "abcdefghij.execute-api.us-west-2.amazonaws.com",
        Origin: "https://www.example.com",
        "User-Agent": "Amazon CloudFront",
        Via:
            "1.1 fda3b2797d2719576f6b916583a28e52.cloudfront.net (CloudFront), 1.1 36810aa1793ee589dc8c194860296079.cloudfront.net (CloudFront)",
        "X-Amz-Cf-Id": "1qqWau0XonE5dkx9itahWPUYH_iISQ6g79xZC4VedqtU4LvQyuxpSg==",
        "X-Amzn-Trace-Id": "Root=1-5f52a875-7474a6049e17f28a2d083e72",
        "X-Forwarded-For": "192.0.2.0, 64.252.141.156, 64.252.141.131",
        "X-Forwarded-Port": "443",
        "X-Forwarded-Proto": "https",
        "X-Requested-With": "XMLHttpRequest"
    },
    httpMethod: "GET",
    isBase64Encoded: false,
    multiValueHeaders: {
        Accept: ["*/*"],
        "Accept-Encoding": ["gzip, deflate, br"],
        "CloudFront-Forwarded-Proto": ["https"],
        "CloudFront-Is-Desktop-Viewer": ["true"],
        "CloudFront-Is-Mobile-Viewer": ["false"],
        "CloudFront-Is-SmartTV-Viewer": ["false"],
        "CloudFront-Is-Tablet-Viewer": ["false"],
        "CloudFront-Viewer-Country": ["US"],
        "Content-Type": ["application/json"],
        DNT: ["1"],
        Host: ["abcdefghij.execute-api.us-west-2.amazonaws.com"],
        Origin: ["https://www.example.com"],
        "User-Agent": ["Amazon CloudFront"],
        Via:
            ["1.1 fda3b2797d2719576f6b916583a28e52.cloudfront.net (CloudFront), 1.1 36810aa1793ee589dc8c194860296079.cloudfront.net (CloudFront)"],
        "X-Amz-Cf-Id": ["1qqWau0XonE5dkx9itahWPUYH_iISQ6g79xZC4VedqtU4LvQyuxpSg=="],
        "X-Amzn-Trace-Id": ["Root=1-5f52a875-7474a6049e17f28a2d083e72"],
        "X-Forwarded-For": ["192.0.2.0, 64.252.141.156, 64.252.141.131"],
        "X-Forwarded-Port": ["443"],
        "X-Forwarded-Proto": ["https"],
        "X-Requested-With": ["XMLHttpRequest"]
    },
    multiValueQueryStringParameters: null,
    path: "/",
    pathParameters: null,
    queryStringParameters: null,
    requestContext: {
        accountId: "12345678912",
        apiId: randomString(10),
        httpMethod: "GET",
        identity: {
            accessKey: "abcdefg",
            accountId: null,
            apiKey: null,
            apiKeyId: null,
            caller: null,
            cognitoAuthenticationProvider: null,
            cognitoAuthenticationType: null,
            cognitoIdentityId: null,
            cognitoIdentityPoolId: null,
            sourceIp: "64.252.141.131",
            user: null,
            userAgent: "PostmanRuntime/2.4.5",
            userArn: null
        },
        path: "/",
        requestId: "",
        resourceId: randomString(6),
        resourcePath: "/{proxy+}",
        requestTimeEpoch: Date.now(),
        stage: "testStage"
    },
    resource: "/{proxy+}",
    stageVariables: null
};

/**
 * Create a fake ProxyEvent object that can be passed into the handler returned
 * from getLambdaHandler().
 */
export function createTestProxyEvent(url: string = "/", method: string = "GET", overrides: Partial<ProxyEvent> = {}): ProxyEvent {
    const heavyUrl = new URL(url, "https://example.org/");
    const mixedQueryStringParams: { [key: string]: string | string[] } = heavyUrl.search ? querystring.parse(heavyUrl.search.substring(1)) : null;

    return {
        ...defaultTestProxyEvent,
        ...overrides,
        requestContext: {
            ...defaultTestProxyEvent.requestContext,
            ...overrides.requestContext ? overrides.requestContext : {},
            httpMethod: method,
            requestId: uuid.v4()
        },
        httpMethod: method,
        path: heavyUrl.pathname,
        queryStringParameters: deduplicateQueryStringParameters(mixedQueryStringParams),
        multiValueQueryStringParameters: normalizeMultiValueQueryStringParameters(mixedQueryStringParams)
    };
}

/**
 * Turn a query params object that allows for duplicate query string values into one that doesn't.
 * Empirically API Gateway takes the last version on duplicates.
 */
function deduplicateQueryStringParameters(params: { [key: string]: string | string[] }): { [key: string]: string } {
    if (params == null) {
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

function normalizeMultiValueQueryStringParameters(params: { [key: string]: string | string[] }): { [key: string]: string[] } {
    if (params == null) {
        return null;
    }

    const multiValueQueryStringParameters: { [key: string]: string[] } = {};
    for (const key in params) {
        const value = params[key];
        if (Array.isArray(value)) {
            multiValueQueryStringParameters[key] = value;
        } else {
            multiValueQueryStringParameters[key] = [value];
        }
    }
    return multiValueQueryStringParameters;
}
