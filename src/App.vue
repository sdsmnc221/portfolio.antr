<script setup>
import RowGrid from '@modules/RowGrid/RowGrid.vue';

import { preloadImages, preloadFonts } from '@utils';
import projectsAdapter from '@utils/prismic/projectsAdapter';
import { onMounted, ref } from 'vue';
import { useSinglePrismicDocument } from '@prismicio/vue';

import '@/assets/scss/global/index.scss';

const projects = ref([]);

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

setTimeout(() => {
  if (doc.value && doc.value.data) {
    projects.value = projectsAdapter(doc.value.data.projects);
  }
}, 1000);

// Preload images and fonts
onMounted(() => {
  Promise.all([preloadImages('.cell__img-inner')]).then(() => {
    document.body.classList.remove('loading');
  });
});
</script>

<template>
  <main>
    <header class="intro">
      <h1>Hello, I'm <span>Thi Van An TRUONG</span></h1>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Maiores pariatur aut ut ad eaque natus neque!
        Architecto iusto velit dolores sapiente, eligendi, nobis explicabo molestias voluptatibus magni dignissimos
        porro maiores.
      </p>
    </header>
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
.intro {
  padding: 1rem 3rem;
}

.intro p {
  max-width: 860px;
}

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
