import * as jsonschema from "jsonschema";

/**
 * RouterEvent.validateBody() options.  Extends jsonschema.validate() Options.
 */
export interface ValidateBodyOptions extends jsonschema.Options {
    /**
     * The HTTP status code to use for validation errors.  Defaults to 422.
     */
    httpStatusCode?: number;
}
