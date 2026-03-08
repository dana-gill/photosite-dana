import { define } from "../../utils.ts";
import type { RouteConfig } from "fresh";

export const config: RouteConfig = { skipAppWrapper: true };

export default define.page(function AdminLayout({ Component }) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Admin - Dana Gill Photography</title>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <nav class="bg-white border-b border-gray-200 px-6 py-4">
          <div class="max-w-5xl mx-auto flex gap-6 items-center">
            <a href="/admin" class="font-semibold text-gray-900">Admin</a>
            <a href="/" class="text-gray-500 text-sm hover:text-gray-900">← Site</a>
          </div>
        </nav>
        <main class="max-w-5xl mx-auto px-6 py-8">
          <Component />
        </main>
      </body>
    </html>
  );
});
