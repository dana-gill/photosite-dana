const capitalizeWords = (str: string): string => {
  return str
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const handler = async () => {
  const workDir = new URL("../work", import.meta.url).pathname;
  const entries = [];

  for await (const entry of Deno.readDir(workDir)) {
    if (entry.isFile && entry.name.endsWith(".tsx")) {
      const fileName = entry.name.replace(".tsx", "");
      entries.push({
        href: `/work/${fileName}`,
        label: capitalizeWords(fileName),
      });
    }
  }

  return new Response(JSON.stringify(entries), {
    headers: { "Content-Type": "application/json" },
  });
};
