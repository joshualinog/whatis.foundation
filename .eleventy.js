module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/.nojekyll");

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "docs",
    },
    passthroughFileCopy: true,
  };
};
