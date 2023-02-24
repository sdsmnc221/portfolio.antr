<script setup>
import Intro from '@elements/Intro.vue';
import RowGrid from '@modules/RowGrid/RowGrid.vue';
import Outro from '@elements/Outro.vue';

import projectsAdapter from '@utils/prismic/projectsAdapter';
import introAdapter from '@utils/prismic/introAdapter';
import outroAdapter from '@utils/prismic/outroAdapter';

import { ref, watch } from 'vue';
import { useSinglePrismicDocument, usePrismic } from '@prismicio/vue';

import '@/assets/scss/global/index.scss';

const doc = ref(null);
const projects = ref([]);
const intro = ref(null);
const outro = ref(null);

const { data } = useSinglePrismicDocument('homepage', {
  fetchLinks: [
    'project.title',
    'project.row_images',
    'project.preview_images',
    'project.description',
    'project.video',
    'project.link',
    'project.year',
    'project.display_images',
  ],
});

setTimeout(() => {
  doc.value = data;
}, 1000);

const prismic = usePrismic();

watch(doc, async (newVal) => {
  if (newVal.value && newVal.value.data) {
    projects.value = await projectsAdapter(newVal.value.data.projects, prismic);
    intro.value = introAdapter(
      newVal.value.data.body.find((slice) => slice.slice_type === 'intro'),
      prismic
    );
    outro.value = outroAdapter(
      newVal.value.data.body.find((slice) => slice.slice_type === 'outro'),
      newVal.value.tags
    );
  }
});
</script>

<template>
  <main>
    <Intro v-if="intro" v-bind="intro" />
    <RowGrid :data="projects" />
    <Outro v-if="outro" v-bind="outro" />
  </main>
</template>

<style>
@media screen and (min-width: 61em) {
  :root {
    --padding-sides: 4rem;
    --padding-row: 2rem;
  }
}
</style>
