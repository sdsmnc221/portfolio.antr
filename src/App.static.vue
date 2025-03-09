<script setup>
import Loader from '@elements/Loader.vue';
import Intro from '@elements/Intro.vue';
import RowGrid from '@modules/RowGrid/RowGrid.vue';
import Outro from '@elements/Outro.vue';

import projectsAdapter from '@utils/prismic/projectsAdapter';
import introAdapter from '@utils/prismic/introAdapter';
import outroAdapter from '@utils/prismic/outroAdapter';

import { ref, watch } from 'vue';
import { useSinglePrismicDocument, usePrismic } from '@prismicio/vue';

import prismisStaticDoc from './assets/prismic-data.json';

import '@/assets/scss/global/index.scss';

const doc = ref(null);
const projects = ref([]);
const intro = ref(null);
const outro = ref(null);

// const { data } = useSinglePrismicDocument('homepage', {
//   fetchLinks: [
//     'project.title',
//     'project.row_images',
//     'project.preview_images',
//     'project.description',
//     'project.video',
//     'project.link',
//     'project.year',
//     'project.display_images',
//   ],
// });

setTimeout(() => {
  doc.value = prismisStaticDoc.homepage.results[0];
}, 1000);

const prismic = usePrismic();

watch(
  doc,
  (newDoc) => {
    if (newDoc && newDoc.data) {
      setTimeout(async () => {
        projects.value = await projectsAdapter(newDoc.data.projects, prismic);
        intro.value = introAdapter(
          newDoc.data.body.find((slice) => slice.slice_type === 'intro'),
          prismic
        );
        outro.value = outroAdapter(
          newDoc.data.body.find((slice) => slice.slice_type === 'outro'),
          newDoc.tags
        );
      }, 4800);
    }
  },
  { immediate: true }
);
</script>

<template>
  <main>
    <Intro v-if="intro" v-bind="intro" />
    <RowGrid :data="projects" />
    <Outro v-if="outro" v-bind="outro" />
  </main>

  <Transition name="fade">
    <Loader v-if="projects.length === 0" />
  </Transition>
</template>

<style></style>
