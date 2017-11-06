# Cassava
```
╭─────╥─────╥─────╥─────╥─────┬╮  ╭┬─────╮
│  ╭──╢ ╭_╮ ║ ════╣ ════╣ ╭_╮ │ ╲╱ │ ╭_╮ │
│  ╰──╢ ╭─╮ ╠════ ╠════ ║ ╭─╮ │╲  ╱│ ╭─╮ │
╰─────╨─╯ ╰─╨─────╨─────╨─╯ ╰─╯ ╰╯ ╰─╯ ╰─╯
  AWS API Gateway Router
```

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

## Example

```typescript
import * as cassava from "cassava";

const router = new cassava.Router();

// A custom route that comes with Cassava providing console logging of requests.
router.route(new cassava.routes.LoggingRoute());

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

// A custom Route that handles PUT or PATCH on any path starting with /upload/
router.route({
    matches: evt => {
        return (evt.httpMethod === "PUT" || evt.httpMethod === "PATCH") &&
            evt.path.startsWith("/upload/");
    },
    handle: async evt => {
        // ... store payload in evt.body
        return {
            statusCode: 204
        }
    }
});

// Intall the router as the handler for this lambda.
export const handler = router.getLambdaHandler();
```

## The name

Cassava is a starchy root vegetable grown all over the world.  The more you know.  ┈┅*
