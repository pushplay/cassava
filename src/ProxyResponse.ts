/**
 * API Gateway proxy response object.
 * see: http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-set-up-simple-proxy.html#api-gateway-simple-proxy-for-lambda-output-format
 */
export interface ProxyResponse {
    /**
     * The HTTP status code to respond with.
     */
    statusCode: number;

    /**
     * Headers to set on the response.
     */
    headers: { [key: string]: string };

    /**
     * Headers to set on the response.  Can contain multi-value headers
     * as well as single-value headers.
     *
     * If you specify values for both headers and multiValueHeaders, API Gateway
     * merges them into a single list. If the same key-value pair is specified in
     * both, only the values from multiValueHeaders will appear in the merged list.
     */
    multiValueHeaders: { [header: string]: string[] };

    /**
     * The string representation of the JSON to respond with.
     */
    body: string;

    /**
     * For binary support set this to `true` and base64 encode the body.
     */
    isBase64Encoded?: boolean;
}

export type ProxyResponseCallback = (error?: Error, result?: ProxyResponse) => void;
