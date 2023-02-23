import { createPrismic } from '@prismicio/vue';

const prismic = createPrismic({
  endpoint: import.meta.env.VITE_PRISMIC_REPOSITORY,
});

export default prismic;
