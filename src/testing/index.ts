import * as awslambda from "aws-lambda";
import {ProxyResponse, ProxyResponseCallback} from "../ProxyResponse";
import {ProxyEvent} from "../ProxyEvent";
import {createTestLambdaContext} from "./createTestLambdaContext";
export {createTestProxyEvent} from "./createTestProxyEvent";

/**
 * Test the given lambdaHandler with the given ProxyEvent and return the result
 * in a Promise.  This plus `createTestProxyEvent` is the easiest way to test
 * a Router, especially with the async/await pattern.
 */
export function testLambdaHandler(lambdaHandler: (evt: ProxyEvent, ctx: awslambda.Context, callback: ProxyResponseCallback) => void, proxyEvent: ProxyEvent): Promise<ProxyResponse> {
    return new Promise<ProxyResponse>((resolve, reject) => {
        lambdaHandler(proxyEvent, createTestLambdaContext(proxyEvent), (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}
