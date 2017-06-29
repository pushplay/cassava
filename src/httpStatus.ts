/**
 * Standard HTTP status codes.
 * @see <a href="https://tools.ietf.org/html/rfc4918">https://tools.ietf.org/html/rfc4918</a>
 * @see <a href="https://tools.ietf.org/html/rfc7231">https://tools.ietf.org/html/rfc7231</a>
 */
export const httpStatusCode = {

    /**
     * Status codes for successful responses.
     */
    success: {
        /**
         * The request has succeeded.  The payload depends on the request method.
         *
         * GET  a representation of the target resource,
         *
         * HEAD  the same representation as GET, but without the representation
         * data,
         *
         * POST  a representation of the status of, or results obtained from,
         * the action,
         *
         * PUT, DELETE  a representation of the status of the action,
         *
         * OPTIONS  a representation of the communications options,
         *
         * TRACE  a representation of the request message as received by the end
         * server.
         */
        OK: 200,

        /**
         * The request has been fulfilled and has resulted in one or more new
         * resources being created.
         */
        CREATED: 201,

        /**
         * The request has been accepted for processing, but the processing has
         * not been completed.  The primary resource created by the request is
         * identified by either a Location header field in the response or, if
         * no Location field is received, by the effective request URI.
         */
        ACCEPTED: 202,

        /**
         * The request was successful but the enclosed payload has been modified
         * from that of the origin server's 200 (OK) response by a transforming
         * proxy.
         */
        NON_AUTHORITATIVE_INFORMATION: 203,

        /**
         * The server has successfully fulfilled the request and there is no
         * content to send in the response payload body.
         */
        NO_CONTENT: 204,

        /**
         * The server has fulfilled the request and desires that the user agent
         * reset the "document view", which caused the request to be sent, to
         * its original state as received from the origin server.
         */
        RESET_CONTENT: 205
    },

    /**
     * Status codes for redirect.  Pay special attention to which one is used
     * because they have subtle differences in browser and search engine behavior.
     */
    redirect: {
        /**
         * The target resource has more than one representation, each with its own
         * more specific identifier, and information about the alternatives is being
         * provided so that the user (or user agent) can select a preferred
         * representation by redirecting its request to one or more of those
         * identifiers.
         */
        MULTIPLE_CHOICES: 300,

        /**
         * The resource moved permanently.  Browsers will change POST to GET
         * on redirect.  Search engines will update their index.
         *
         * Include a Location header field in the response.
         */
        MOVED_PERMANENTLY: 301,

        /**
         * The resource moved temporarily.  Browsers will change POST to GET
         * on redirect.  Search engines will *not* update their index.
         *
         * Include a Location header field in the response.
         */
        FOUND: 302,

        /**
         * The server is redirecting the user agent to a different resource, as
         * indicated by a URI in the Location header field, which is intended to
         * provide an indirect response to the original request.
         */
        SEE_OTHER: 303,

        /**
         * Cache hit.  No content is sent.  This is determined by the request
         * headers If-Modified-Since or If-None-Match.
         */
        NOT_MODIFIED: 304,

        /**
         * The resource moved temporarily and browsers should resubmit,
         * preserving the method and body.  Don't use for GET.
         * Search engines will update their index.
         *
         * Include a Location header field in the response.
         */
        TEMPORARY_REDIRECT: 307,

        /**
         * The resource moved permanently and browsers should resubmit,
         * preserving the method and body.  Don't use for GET.
         * Search engines will *not* update their index.
         *
         * Include a Location header field in the response.
         */
        PERMANENT_REDIRECT: 308
    },

    /**
     * The client screwed up.
     */
    clientError: {
        /**
         * The request could not be understood by the server due to malformed
         * syntax. The client SHOULD NOT repeat the request without modifications.
         * For example the JSON body could not be parsed.
         */
        BAD_REQUEST: 400,

        /**
         * Authentication is required and the user is not logged in.
         */
        UNAUTHORIZED: 401,

        /**
         * The user is authenticated but does not have permission.
         */
        FORBIDDEN: 403,

        /**
         * The requested resource was not found.
         */
        NOT_FOUND: 404,

        /**
         * The resource does not support the given method.
         * The origin server MUST generate an Allow header field
         * containing a list of the supported methods.
         */
        METHOD_NOT_ALLOWED: 405,

        /**
         * The target resource does not have a current representation that would
         * be acceptable to the user agent, according to the proactive negotiation
         * header fields received in the request.
         */
        NOT_ACCEPTABLE: 406,

        /**
         * The request was understood, and semantically correct, but conflicts
         * with the current state.  For example: the type is locked.
         */
        CONFLICT: 409,

        /**
         * Access to the target resource is no longer available at the origin server
         * and this condition is likely to be permanent.
         *
         * The 410 response is primarily intended to assist the task of web
         * maintenance by notifying the recipient that the resource is
         * intentionally unavailable and that the server owners desire that
         * remote links to that resource be removed.
         */
        GONE: 410,

        /**
         * The server refuses to accept the request without a defined Content-Length.
         */
        LENGTH_REQUIRED: 411,

        /**
         * The request is larger than the server is willing or able to process.
         */
        PAYLOAD_TOO_LARGE: 413,

        /**
         * The request type has a media type which the server or resource
         * does not support.
         */
        UNSUPPORTED_MEDIA_TYPE: 415,

        /**
         * The client has asked for a portion of the file (byte serving), but
         * the server cannot supply that portion.
         */
        REQUESTED_RANGE_NOT_SATISFIABLE: 416,

        /**
         * The expectation given in the request's Expect header field could not
         * be met.
         */
        EXPECTATION_FAILED: 417,

        /**
         * The request is syntactically correct, but contains semantic errors.
         * For example a string was expected but got a number.
         * @see <a href="https://tools.ietf.org/html/rfc4918#section-11.2">https://tools.ietf.org/html/rfc4918#section-11.2</a>
         */
        UNPROCESSABLE_ENTITY: 422,

        /**
         * The user has sent too many requests in a given amount of time.
         */
        TOO_MANY_REQUESTS: 429
    },

    /**
     * The server screwed up.
     */
    serverError: {
        /**
         * Generic server-side error.
         */
        INTERNAL_SERVER_ERROR: 500,

        /**
         * Usually implies future availability.
         */
        NOT_IMPLEMENTED: 501,

        /**
         * Received an invalid response from an inbound server it accessed while
         * acting as a proxy.
         */
        BAD_GATEWAY: 502,

        /**
         * A service is temporarily down.
         */
        SERVICE_UNAVAILABLE: 503,

        /**
         * Did not receive a timely response from an upstream server while acting
         * as a proxy.
         */
        GATEWAY_TIMEOUT: 504,
    }
};

export const httpStatusString: { [statusCode: number]: string } = {
    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non Authoritative Info",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    207: "Multi Status",
    208: "Already Reported",
    226: "IM Used",
    300: "Multiple Choices",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    305: "Use Proxy",
    307: "Temporary Redirect",
    308: "Permanent Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    407: "Proxy Auth Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Payload Too Large",
    414: "Request URI Too Long",
    415: "Unsupported Media Type",
    416: "Range Not Satisfiable",
    417: "Expectation Failed",
    422: "Unprocessable Entity",
    423: "Locked",
    424: "Failed Dependency",
    426: "Upgrade Required",
    428: "Precondition Required",
    429: "Too Many Requests",
    431: "Request Header Fields Too Large",
    451: "Unavailable For Legal Reasons",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported",
    506: "Variant Also Negotiates",
    507: "Insufficient Storage",
    508: "Loop Detected",
    510: "Not Extended",
    511: "Network Authentication Required"
};
