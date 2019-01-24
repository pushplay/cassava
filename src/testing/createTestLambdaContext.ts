import * as awslambda from "aws-lambda";
import * as uuid from "uuid/v4";
import {ProxyEvent} from "../ProxyEvent";

export {createTestProxyEvent} from "./createTestProxyEvent";

const defaultContext: awslambda.Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: "lambdafunction",
    functionVersion: "1.0",
    invokedFunctionArn: "",
    memoryLimitInMB: 128,
    awsRequestId: "",
    logGroupName: "/aws/lambda/lambdafunction",
    logStreamName: "",
    getRemainingTimeInMillis: () => 60,
    done: () => {
    },
    fail: () => {
    },
    succeed: () => {
    }
};

export function createTestLambdaContext(proxyEvent: ProxyEvent, overrides: Partial<awslambda.Context> = {}): awslambda.Context {
    const date = new Date();
    return {
        ...defaultContext,
        awsRequestId: proxyEvent.requestContext.requestId,
        invokedFunctionArn: `arn:aws:lambda:us-east-1:${proxyEvent.requestContext.accountId}:function:lambdafunction`,
        logStreamName: `${date.getFullYear()}/${date.getMonth()}/${date.getDay()}/[$LATEST]${uuid().replace("-", "")}`,
        ...overrides
    };
}
