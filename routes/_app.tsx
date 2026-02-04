import Nav from "../islands/Nav.tsx";
import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    /* Congrats! You found an easter egg. */
    /* I wrote this website myself. 
    /* You are welcome to roast my code here:
    /* https://github.com/dana-gill/photosite-dana */
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Dana Gill Photography</title>
        <link rel="icon" type="image/jpeg" href="/favicon.jpg" />
      </head>
      <body>
        <Nav />
        <Component />
      </body>
    </html>
  );
});
