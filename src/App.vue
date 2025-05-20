<script setup>
import Loader from '@elements/Loader.vue';

import { ref } from 'vue';

import '@/assets/scss/global/index.scss';
import { RouterView } from 'vue-router';

const projects = ref([]);

const updateProjects = ({ projects: projectsFromComponents }) => {
  projects.value = projectsFromComponents;
};
</script>

<template>
  <main>
    <RouterView v-slot="{ Component }">
      <component :is="Component" @update:projects="updateProjects"></component>
    </RouterView>
  </main>

  <Transition name="fade">
    <Loader v-if="projects.length === 0" />
  </Transition>
</template>

<style></style>
