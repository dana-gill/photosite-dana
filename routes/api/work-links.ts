const capitalizeWords = (str: string): string => {
  const lowercaseWords = new Set([
    "a", "an", "and", "as", "at", "but", "by", "for", "from",
    "in", "into", "of", "on", "or", "the", "to", "with"
  ]);

  const words = str.split("-");

  return words
    .map((word, index) => {
      const lowerWord = word.toLowerCase();
      const isFirstWord = index === 0;
      const shouldCapitalize = isFirstWord || !lowercaseWords.has(lowerWord);

      return shouldCapitalize
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : lowerWord;
    })
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
