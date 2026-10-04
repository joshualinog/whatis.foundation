const MarkdownIt = require("markdown-it");

// Issue bodies are written by hand; raw HTML is not rendered.
const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/.nojekyll");
  eleventyConfig.addWatchTarget("src/content/");
  eleventyConfig.addWatchTarget("scripts/lib/");

  eleventyConfig.addFilter("forPart", (bases, partNumber) =>
    bases.filter((base) => base.part_parent === partNumber)
  );
  // "Base 02" -> 2; anything without a base number -> null
  eleventyConfig.addFilter("baseNumber", (ref) => {
    const match = /(\d+)/.exec(String(ref));
    const number = match ? Number(match[1]) : null;
    return number !== null && number >= 0 && number <= 101 ? number : null;
  });
  eleventyConfig.addFilter("markdown", (text) => markdown.render(text || ""));

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "data",
      output: "docs",
    },
    passthroughFileCopy: true,
  };
};
