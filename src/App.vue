<script setup>
import RowGrid from '@modules/RowGrid/RowGrid.vue';

import { preloadImages, preloadFonts } from '@utils';
import { onMounted } from 'vue';

import '@/assets/scss/global/index.scss';

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
    <RowGrid />
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
