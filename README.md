# Cassava

AWS API Gateway Router

Find the full documentation at https://giftbit.github.io/cassava/

## Routing

There are two ways to add routes to Cassava.
- `route(string|RegExp)`
  - simplest method that handles most cases
  - string routes are case insensitive and support path parameters
  - RegExp routes place matching groups in the path parameters
- `route(Route)`
  - provides the most flexibility
  - can modify responses before they are sent
  - is the most work to implement

Cassava processes REST events by examining installed routes from top-to-bottom.  Cassava works downwards to find the first route that matches and responds, and then works back up to do any post-processing.

A route responds when: it matches the event, has a `handle` function, and handles the event by returning a response object or Promise that resolves to a response object.

A route can post-process the response when: it matches the event, did not return a response object in `handle`, and has a `postProcess` function.  Post processing can be used to modify the response or cause some side effect such as logging.

## RouteBuilder

[RouteBuilder](https://giftbit.github.io/cassava/interfaces/_routes_buildableroute_.routebuilder.html) is the simplest way to add a route to Cassava.  A RouteBuilder instance is started with `router.route(string)` or `router.route(RegExp)`, then with chained function calls you can specify the HTTP method, add a `handle` function or a `postProcess` function.

The details of handling and post-processing are covered later in this document.

For example...

```typescript
import * as cassava from "cassava";

const router = new cassava.Router();

// A simple route that only handles GET on /helloWorld
router.route("/helloWorld")
    .method("GET")
    .handler(async evt => {
        return {
            body: "Hello world!"
        };
    });

// A fancier route with a path parameter `name`.
// match egs: `/hello/jeff` or `/Hello/Jeffery`
router.route("/hello/{name}")
    .method("GET")
    .handler(async evt => {
        return {
            body: `Hello ${evt.pathParameters["name"]}!`
        };
    });

// Install the router as the handler for this lambda.
export const handler = router.getLambdaHandler();
```

## Custom Routes

A custom route is one that implements the [Route](https://giftbit.github.io/cassava/interfaces/_routes_route_.route.html) interface: it must have a `matches` function that accepts a `RouterEvent` and returns a boolean and at least one of a `handle` function and `postProcess` function.

The details of RouterEvents, handling and post-processing are covered later in this document.

For example...

```typescript
import * as cassava from "cassava";

const router = new cassava.Router();

// A custom route that comes with Cassava providing console logging of requests.
// This route has both a `handle` and `postProcess` function to log both requests and responses.
router.route(new cassava.routes.LoggingRoute());

// A custom Route that handles PUT or PATCH on any path starting with /upload/
router.route({
    matches: evt => {
        return (evt.httpMethod === "PUT" || evt.httpMethod === "PATCH") &&
            evt.path.startsWith("/upload/");
    },
    handle: async evt => {
        const fileName = evt.path.substring("/upload/".length);
        const fileContents = evt.body;
        // ... store fileContents with fileName
        return {
            statusCode: 204
        };
    }
});

// Install the router as the handler for this lambda.
export const handler = router.getLambdaHandler();
```

## RouterEvents, RouterResponses, handling and postProcessing

[RouterEvents](https://giftbit.github.io/cassava/modules/_routerevent_.html) are the input to `matches` and `handle` functions.  They fully describe all information about the REST request including the full body as streaming is not supported.

A `handle` function takes in a RouterEvent and can return the following: `null` or `undefined` to not handle the RouterEvent in which case further routes are consulted; a [RouterResponse](https://giftbit.github.io/cassava/interfaces/_routerresponse_.routerresponse.html) that represents the response sent to the client; a Promise that resolves to `null` or `undefined` which will again let further routes handle the request; a Promise that resolves to a RouterResponse which again will be the response sent to the client.

[RouterResponses](https://giftbit.github.io/cassava/interfaces/_routerresponse_.routerresponse.html) include the body, an optional HTTP status code (defaults to 200), and optionally any headers that might be set.

A `postProcess` function takes in both the RouterEvent and the current RouterResponse.  It can return `null` or `undefined` or a Promise resolving to one of those to not affect the final response; or it can return a RouterResponse or a Promise resolving to a RouterResponse to change the response.

## Response serialization

The default assumption is that you're building a JSON-based API so that's the simplest case.  By default the response body will be JSON stringified and the header `Content-Type` set to `application/json`.  This is true even if the body is a `string`.  If you don't want that behavior you have two options:

### Manual Content-Type

The first option for returning non-JSON is to set the response body to a `string` or `Buffer`, and set the `Content-Type` header.  This works when using a custom route or the route builder.  For example:

```typescript
router.route("/robots")
    .method("GET")
    .handler(async evt => {
        return {
            headers: {
                "Content-Type": "text/csv"
            },
            body: "robot,film\nRobby,Forbidden Planet\nGort,The Day the Earth Stood Still"
        };
    });
```

This is simple to implement but ignores the client's `Accept` header.  This endpoint will always return csv regardless of what the client asks for.

### RouteBuilder.serializers

When using the route builder there is a second option of letting the handler return a complex object as in the JSON case, but defining serializer functions for each response mime type.  The appropriate serializer will be chosen based upon the client's `Accept` header.  In the following example the same endpoint can return one of JSON, CSV and XML.

```typescript
router.route("/robots")
    .method("GET")
    .serializers({
        "application/json": cassava.serializers.json,
        "text/csv": body => new json2csv.Parser({fields: ["robot", "film"]}).parse(body),
        "application/xml": body => jsontoxml({robots: body})
    })
    .handler(async evt => {
        return {
            body: [
              {
                  robot: "Robby",
                  film: "Forbidden Planet"
              },
              {
                  robot: "Gort",
                  film: "The Day the Earth Stood Still"
              }
            ]
        };
    });
```

In this example CSV serialization is handled by [json2csv](https://www.npmjs.com/package/json2csv) and XML serialization by [jsontoxml](https://www.npmjs.com/package/jsontoxml).  These libraries are not included with Cassava and you're free to choose your own serialization libraries.

## RouterEvent Validation

[RouterEvent](https://giftbit.github.io/cassava/modules/_routerevent_.html) comes with a number of utility functions to validate the event.

- `blacklistQueryStringParameters(...params: string[])` disallow any of the given query parameters
- `requireHeader(field: string)` require that a header is set
- `requireHeader(field: string, values: string[], explanation?: string)` require that a header is set and takes one of a given list of values
- `requireHeader(field: string, validator: function, explanation?: string)` require that a header is set and satisfies the validator function
- `requireQueryStringParameter(param: string)` require that a query parameter is set
- `requireQueryStringParameter(param: string, values: string[], explanation?: string)` require that a query parameter is set and takes one of a given list of values
- `requireQueryStringParameter(param: string, validator: function, explanation?: string)` require that a query parameter is set and satisfies the validator function
- `validateBody(schema: Schema, options?: ValidateBodyOptions)` validate the request body using [JSON Schema](https://spacetelescope.github.io/understanding-json-schema/index.html)
- `whitelistQueryStringParameters(...params: string[])` disallow any query parameters other than the ones set

An example:

```typescript
import * as cassava from "cassava";

const router = new cassava.Router();

// Get a location
router.route("/locations/{locationId}")
    .method("GET")
    .handler(async evt => {
        evt.whitelistQueryStringParameters();   // don't allow any query params
        return {
            body: getLocationById(evt.pathParameters.locationId)
        };
    });

// Set a location
router.route("/locations/{locationId}")
    .method("POST")
    .handler(async evt => {
        evt.validateBody({
             type: "object",
             properties: {
                 latitude: { "type": "number" },
                 longitude: { "type": "number" }
             },
             required: ["latitude", "longitude"]
         });
        return {
            body: setLocationId(evt.pathParameters.locationId, evt.body)
        };
    });

// Query for locations
router.route("/locations")
    .method("GET")
    .handler(async evt => {
        evt.requireQueryStringParameter("query");
        return {
            body: getLocationsByQuery(evt.queryStringParameters.query)
        };
    });

// Install the router as the handler for this lambda.
export const handler = router.getLambdaHandler();
```

## The Name

Cassava is a starchy root vegetable grown all over the world.  The more you know.  ┈┅*
