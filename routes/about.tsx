import { Head } from "fresh/runtime";

export default function About() {
  return (
    <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
      <Head>
        <title>About - Dana Gill Photography</title>
      </Head>
      <div class="max-w-4xl mx-auto pt-20">
        <div class="prose prose-lg mx-auto">
          <p class="text-gray-700 leading-relaxed">
            Dana Gill is an artist based in Berlin. She shoots primarily with analog on a Minolta, but also enjoys shooting digitally. She enjoys capturing portraits and various moments from travels.
          </p>
          <p class="text-gray-700 mt-4 leading-relaxed">
            For inquiries, please reach out via email at danougill [@] gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}
