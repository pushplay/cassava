import {ProxyResponse} from "../ProxyResponse";
import {ProxyEvent} from "../ProxyEvent";
import {createTestLambdaContext} from "./createTestLambdaContext";
import {Router} from "../Router";

export {createTestProxyEvent} from "./createTestProxyEvent";

/**
 * Test the given Router with the given ProxyEvent and return the result
 * in a Promise.  This plus `createTestProxyEvent` is the easiest way to test
 * a Router, especially with the async/await pattern.
 */
export function testRouter(router: Router, proxyEvent: ProxyEvent): Promise<ProxyResponse> {
    return new Promise<ProxyResponse>((resolve, reject) => {
        if (!router || !router.getLambdaHandler) {
            reject("router must be an instance of Router");
        }

        const responsePromise = router.getLambdaHandler()(proxyEvent, createTestLambdaContext(proxyEvent), (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });

        if (responsePromise) {
            responsePromise.then(res => resolve(res), err => reject(err));
        }
    });
}
