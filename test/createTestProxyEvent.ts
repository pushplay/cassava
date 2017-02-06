import {ProxyEvent} from "../src/ProxyEvent";

const defaultTestProxyEvent: ProxyEvent = {
    resource: "/{proxy+}",
    path: "",
    httpMethod: "GET",
    headers: null,
    queryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    context: {
        "accountId": "12345678912",
        "resourceId": "roq9wj",
        "stage": "testStage",
        "requestId": "deef4878-7910-11e6-8f14-25afc3e9ae33",
        "identity": {
            "accessKey": "abcdefg",
            "cognitoIdentityPoolId": null,
            "accountId": null,
            "caller": null,
            "apiKey": null,
            "sourceIp": "192.168.196.186",
            "cognitoAuthenticationType": null,
            "cognitoAuthenticationProvider": null,
            "userArn": null,
            "userAgent": "PostmanRuntime/2.4.5",
            "user": null
        },
        "resourcePath": "/{proxy+}",
        "httpMethod": "POST",
        "apiId": "gy415nuibc"
    },
    body: null,
    isBase64Encoded: false
};

export function createTestProxyEvent(path: string, p: Partial<ProxyEvent> = {}): ProxyEvent {
    return {...defaultTestProxyEvent, path: path, ...p};
}
