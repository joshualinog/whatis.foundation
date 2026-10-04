// Giscus (https://giscus.app) powers comments on every base page.
// Repo and category IDs come from the giscus.app configurator; set them as
// repository variables (GISCUS_REPO_ID, GISCUS_CATEGORY_ID) so CI can inject them.
module.exports = {
  giscus: {
    repo: process.env.GISCUS_REPO || 'joshualinog/whatis.foundation',
    repoId: process.env.GISCUS_REPO_ID || '',
    category: process.env.GISCUS_CATEGORY || 'Announcements',
    categoryId: process.env.GISCUS_CATEGORY_ID || '',
  },
};
