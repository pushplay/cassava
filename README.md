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

A route responds when it matches the event, has a `handle` function, and handles the event by returning a Promise that resolves to a non-null response.

A route can post-process the response when it matches the event, did not handle the event, and has a `postProcess` function.  Post processing can be used to modify the response or cause some side effect such as logging.

## RouteBuilders

[RouteBuilders](https://giftbit.github.io/cassava/interfaces/_routes_buildableroute_.routebuilder.html) are the simplest way to add a route to Cassava.  A RouteBuilder instance is started with `router.route(string)` or `router.route(RegExp)`, then with chained function calls you can specify the HTTP method, add a `handle` function or a `postProcess` function.

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

## The name

Cassava is a starchy root vegetable grown all over the world.  The more you know.  ┈┅*
