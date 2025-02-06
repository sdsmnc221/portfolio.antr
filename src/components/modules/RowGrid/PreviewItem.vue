<script setup>
import PreviewButton from '@elements/PreviewButton.vue';
import PreviewContent from '@elements/PreviewContent.vue';
import Tag from '@elements/Tag.vue';

import { randomFontWeight, randomDuration } from '@utils';

const props = defineProps({
  previewTitle: {
    type: String,
    required: true,
  },
  previewImages: {
    type: Array,
    default: () => [],
  },
  previewContent: {
    type: String,
    default: null,
  },
  previewVideo: {
    type: Object,
    default: null,
  },
  previewHashtags: {
    type: Array,
    default: () => [],
  },
  previewLink: {
    type: Object,
    default: null,
  },
  index: {
    type: Number,
    required: true,
  },
  nbImages: {
    type: Number,
    required: true,
  },
  displayImages: {
    type: Boolean,
    required: true,
  },
});
</script>

<template>
  <div class="preview__item" :style="`--nb-row: ${Math.ceil(nbImages / 4)};`">
    <h2
      class="preview__item-title oh"
      :style="`--font-weight: ${randomFontWeight()}; --weight-animation: ${randomDuration()}s`"
    >
      <span class="oh__inner">{{ previewTitle }}</span>
      <PreviewButton
        v-if="previewLink"
        label="Discover"
        :link="previewLink.url"
        :class="{ '-pink': index % 2 === 0, '-blue': index % 2 !== 0 }"
      />
    </h2>

    <PreviewContent v-if="previewContent" :content="previewContent" :variant="index % 2 === 0 ? 'pink' : 'blue'" />

    <div v-if="previewImages.length > 0" class="grid" :class="{ hidden: !displayImages }">
      <div
        v-for="(image, index) in previewImages"
        :key="`preview-image-${previewTitle}-${index}`"
        class="cell__img"
        :data-img="image.filename"
      >
        <div class="cell__img-inner" :style="`background-image: url(${image.filename})`"></div>
      </div>
    </div>

    <div v-if="previewVideo" class="preview__video">
      <video autoplay muted loop>
        <source :src="previewVideo.url" type="video/mp4" />
      </video>
    </div>

    <div class="preview__hashtags">
      <Tag v-for="(tag, index) in previewHashtags" :key="`hashtag-${previewTitle}-${tag}-${index}`" :text="tag" />
    </div>
  </div>
</template>

<style lang="scss">
.preview {
  --nb-col: 4;
  --nb-row: 1;

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
    padding: 10vh 0;
    padding-top: 12vh;
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
      --font-weight: 100;
      --weight-animation: 0.4s;

      margin: 0;
      position: relative;
      line-height: 1;
      font-family: $ibm-plex;
      font-weight: var(--font-weight);
      text-transform: uppercase;
      white-space: nowrap;
      font-size: clamp(1.563rem, 6vw, 3.815rem);
      animation: weight var(--weight-animation) ease-in-out infinite alternate;
    }
  }

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
      max-height: 64vh;
      display: block;
    }
  }

  &-button {
    &.-pink {
      color: $color-link-pink;
    }
    &.-blue {
      color: $color-link-blue;
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
  grid-template-columns: repeat(var(--nb-col), $img-size-large);
  grid-template-rows: repeat(var(--nb-row), $img-size-large);

  .cell__img {
    width: $img-size-large;
  }

  &.hidden {
    width: 0 !important;
    height: 0 !important;
    margin: 0 !important;
    opacity: 0 !important;
    position: absolute !important;
  }
}

@media #{$mq-mobile} {
  .preview__item {
    padding-top: 16vh;
    gap: 4vh;
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
