import Nav from "../islands/Nav.tsx";
import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html>
      {/* Congrats! You found an easter egg.
        I wrote this website myself.
        You are welcome to roast my code here:
        https://github.com/dana-gill/photosite-dana */}
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Dana Gill Photography</title>
        <meta property="og:site_name" content="Dana Gill Photography" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" type="image/jpeg" href="/favicon.jpg" />
      </head>
      <body>
        <Nav />
        <Component />
      </body>
    </html>
  );
});
