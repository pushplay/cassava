# cassava
Lightweight routing of AWS API Gateway objects.

## Routing

There are two ways to add routes to Cassava.
- `route(string|RegExp)`
  - simplest method that handles most cases
  - string routes are case insensitive and support path parameters
  - RegExp routes place matching groups in the path parameters
- `addCustomRoute(Route)`
  - provides the most flexibility
  - can modify responses before they are sent
  - is the most work to implement

## Example

```typescript
import * as cassava from "cassava";

const router = new cassava.Router();

// A custom route that comes with Cassava providing console logging of requests.
router.addCustomRoute(new cassava.routes.LoggingRoute());

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

// Intall the router as the handler for this lambda.
export const handler = router.getLambdaHandler();
```

## The name

Cassava is a starchy root vegetable grown all over the world.  The more you know.  ┈┅*
