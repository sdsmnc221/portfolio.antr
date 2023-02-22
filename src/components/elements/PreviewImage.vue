<script setup>
const props = defineProps({
  img: {
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
  <figure class="preview-image" @click="onClick">
    <img :src="img" alt="" />
  </figure>
</template>

<style lang="scss" scoped>
.preview-image {
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
