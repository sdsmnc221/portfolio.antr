<script setup>
import PreviewButton from '@elements/PreviewButton.vue';

const props = defineProps({
  previewText: {
    type: String,
    required: true,
  },
  previewImages: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <div class="preview__item">
    <h2 class="preview__item-title oh">
      <span class="oh__inner">{{ previewText }}</span>
      <PreviewButton label="Discover" link="https://uiverse.io/satyamchaudharydev/hungry-parrot-44" />
    </h2>
    <div class="grid">
      <div
        v-for="(image, index) in previewImages"
        :key="`preview-image-${previewText}-${index}`"
        class="cell__img"
        :data-img="image"
      >
        <div class="cell__img-inner" :style="`background-image: url(${image})`"></div>
      </div>
    </div>
    <div class="preview__content">
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Nostrum, ad. Voluptatibus, deserunt temporibus
        necessitatibus dolor, eos commodi molestiae, aliquam ratione quam ducimus doloremque omnis. Quidem, corrupti.
        Molestiae corporis voluptatem suscipit?
      </p>
    </div>
    <div class="preview__video">
      <video autoplay muted loop>
        <source src="vid/video.mp4" type="video/mp4" />
      </video>
    </div>
    <div class="preview__hashtags">
      <p>
        <span>#cat</span>
        <span>#cat</span>
        <span>#cat</span>
      </p>
    </div>
  </div>
</template>

<style lang="scss">
.preview {
  &__item {
    width: 100%;
    height: 100%;
    display: grid;
    align-items: center;
    justify-items: center;
    align-content: start;
    gap: 10vh;
    height: 0;
    opacity: 0;
    overflow: hidden;
    padding: 8vh 0;
    position: relative;
    top: auto;
    left: auto;

    &--current {
      pointer-events: auto;
      min-height: 100vh;
      opacity: 1;
      overflow-y: scroll;
      position: fixed;
      top: 0;
      left: 0;
    }

    &-title {
      margin: 0;
      font-size: clamp(1.953rem, 4vw, 3.052rem);
      position: relative;
      font-weight: 400;
      line-height: 1;
      font-family: neue-haas-grotesk-display, sans-serif;
      white-space: nowrap;
      font-family: lores-22-serif, sans-serif;
      font-weight: 700;
      font-size: clamp(1.563rem, 6vw, 3.815rem);
    }
  }

  &__content,
  &__hashtags {
    margin: 0 auto;
    padding: 0 16vw;
    text-align: center;
  }

  &__video {
    width: 72%;
    height: auto;
    margin: 0 auto;

    video {
      width: 100%;
      height: auto;
      display: block;
    }
  }
}

.grid {
  position: relative;
  display: grid;
  max-width: 1200px;
  width: 100%;
  gap: $image-gap-large;
  justify-content: center;
  justify-items: center;
  grid-template-columns: repeat(4, $img-size-large);
  grid-template-rows: repeat(2, $img-size-large);

  .cell__img {
    width: $img-size-large;
  }
}

@media #{$mq-mobile} {
  .preview__item {
    padding-top: 16vh;
  }

  .grid {
    grid-template-columns: repeat(2, $img-size-xlarge);
    grid-template-rows: repeat(2, $img-size-xlarge);

    .cell__img {
      width: $img-size-xlarge;
    }
  }
}
</style>
