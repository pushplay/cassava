# cassava
Lightweight routing of AWS API Gateway objects.

## Example

```typescript
import * as cassava from "cassava";

const router = new cassava.Router();

router.addCustomRoute(new cassava.routes.LoggingRoute());

router.route("/helloWorld")
    .method("GET")
    .handler(async evt => {
        return {
            body: "Hello world!"
        };
    });

export const handler = router.getLambdaHandler();

```

## The name

Cassava is a starchy root vegetable grown all over the world.  The more you know.  ┈┅*
