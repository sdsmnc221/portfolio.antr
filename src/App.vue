<script setup>
import Intro from '@elements/Intro.vue';
import RowGrid from '@modules/RowGrid/RowGrid.vue';

import projectsAdapter from '@utils/prismic/projectsAdapter';
import introAdapter from '@utils/prismic/introAdapter';

import { ref } from 'vue';
import { useSinglePrismicDocument, usePrismic } from '@prismicio/vue';

import '@/assets/scss/global/index.scss';

const projects = ref([]);
const intro = ref(null);

const { data: doc } = useSinglePrismicDocument('homepage', {
  fetchLinks: [
    'project.title',
    'project.row_images',
    'project.preview_images',
    'project.description',
    'project.video',
    'project.link',
  ],
});

console.log(doc);

const prismic = usePrismic();

setTimeout(() => {
  if (doc.value && doc.value.data) {
    projects.value = projectsAdapter(doc.value.data.projects, prismic);
    intro.value = introAdapter(
      doc.value.data.body.find((slice) => slice.slice_type === 'intro'),
      prismic
    );
  }
}, 1000);
</script>

<template>
  <main>
    <Intro v-if="intro" v-bind="intro" />
    <RowGrid :data="projects" />
    <footer class="outro">
      <p>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Necessitatibus architecto expedita natus nihil alias
        esse vero ipsum, facere est veniam, fugit possimus porro nulla error eum similique ullam repellendus eos!
      </p>
    </footer>
  </main>
</template>

<style>
.outro {
  padding: 1rem 3rem;
}

.outro__text {
  max-width: 860px;
  margin: 1.5rem auto;
  line-height: 1.5;
}

.outro__credits {
  padding-top: 10vh;
  text-align: center;
}

@media screen and (min-width: 61em) {
  :root {
    --padding-sides: 4rem;
    --padding-row: 2rem;
  }
}
</style>
