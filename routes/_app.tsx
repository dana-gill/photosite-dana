import { define } from "../utils.ts";
import Nav from "../islands/Nav.tsx";

export default define.page(function App({ Component, state }) {
  const workLinks = state.workLinks;
  const workPreviews = state.workPreviews;

  return (
    <html>
      {
        /* Congrats! You found an easter egg.
        I wrote this website myself.
        You are welcome to roast my code here:
        https://github.com/dana-gill/photosite-dana */
      }
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Dana Gill Photography</title>
        <meta
          property="og:title"
          content="  Dana Gill Photography - Analog Film Photos from Berlin"
        />
        <meta
          property="og:description"
          content="Dana Gill is a Filipino engineer and hobby-artist based in Berlin, capturing portraits and moments from travels and life with analog film."
        />
        <meta
          property="og:image"
          content="https://reassuring-peace-c7bac71a31.media.strapiapp.com/about_3_a193280a6a.jpg"
        />
        <meta property="og:url" content="https://www.danagill.photography" />
        <meta property="og:site_name" content="Dana Gill Photography" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Dana Gill Photography" />
        <meta
          name="twitter:description"
          content="Dana Gill is a Filipino engineer and hobby-artist based in Berlin, capturing portraits and moments from travels and life with analog film."
        />
        <meta
          name="twitter:image"
          content="https://reassuring-peace-c7bac71a31.media.strapiapp.com/about_3_a193280a6a.jpg"
        />
        <link rel="icon" type="image/jpeg" href="/favicon.jpg" />
      </head>
      <body>
        <Nav workLinks={workLinks} workPreviews={workPreviews} />
        <Component />
      </body>
    </html>
  );
});
