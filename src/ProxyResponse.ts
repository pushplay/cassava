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
     * The string representation of the JSON to respond with.
     */
    body: string;

    /**
     * For binary support set this to `true` and base64 encode the body.
     */
    isBase64Encoded?: boolean;
}

export type ProxyResponseCallback = (error?: Error, result?: ProxyResponse) => void;
