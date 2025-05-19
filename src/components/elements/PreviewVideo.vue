<script setup>
const props = defineProps({
  video: {
    type: String,
    default: '',
  },
  onClick: {
    type: Function,
    default: () => {},
  },
});
</script>

<template>
  <figure class="preview-video" @click="onClick">
    <video autoplay muted controls loops :src="video" alt="" />
  </figure>
</template>

<style lang="scss" scoped>
.preview-video {
  position: fixed;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: grayscale(1) blur(3.2px);
  z-index: 300;

  * {
    position: relative;
    z-index: 1;
  }

  video {
    display: block;
    height: 72vh;
    max-width: 90vw;
    width: auto;
    object-fit: contain;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.32);
    z-index: 0;
  }
}
</style>
