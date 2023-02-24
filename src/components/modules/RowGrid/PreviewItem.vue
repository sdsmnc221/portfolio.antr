<script setup>
import PreviewButton from '@elements/PreviewButton.vue';
import PreviewContent from '@elements/PreviewContent.vue';

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
    type: String,
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
});
</script>

<template>
  <div class="preview__item">
    <h2 class="preview__item-title oh">
      <span class="oh__inner">{{ previewTitle }}</span>
      <PreviewButton
        v-if="previewLink"
        label="Discover"
        :link="previewLink.url"
        :class="{ '-pink': index % 2 === 0, '-blue': index % 2 !== 0 }"
      />
    </h2>

    <PreviewContent v-if="previewContent" :content="previewContent" :variant="index % 2 === 0 ? 'pink' : 'blue'" />

    <div class="grid">
      <div
        v-for="(image, index) in previewImages"
        :key="`preview-image-${previewTitle}-${index}`"
        class="cell__img"
        :data-img="image.filename"
      >
        <div class="cell__img-inner" :style="`background-image: url(${image.filename})`"></div>
      </div>
    </div>

    <div class="preview__video">
      <video autoplay muted loop>
        <source src="vid/video.mp4" type="video/mp4" />
      </video>
    </div>

    <div class="preview__hashtags" v-if="previewHashtags.length > 0">
      <p v-for="(tag, index) in previewHashtags" :key="`hashtag-${previewTitle}-${tag}-${index}`" class="tag">
        #{{ tag }}
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
      margin: 0;
      position: relative;
      line-height: 1;
      font-family: $yeseva-one;
      text-transform: uppercase;
      white-space: nowrap;
      font-weight: 700;
      font-size: clamp(1.563rem, 6vw, 3.815rem);
    }
  }

  &__hashtags {
    margin: 0 auto;
    padding: 0 16vw;
    text-align: center;

    p {
      --border-radius: 25px;
      --border-width: 7px;
      appearance: none;
      position: relative;
      padding: 1em 2em;
      border: 0;
      font-family: $major-mono;
      z-index: 2;
      display: inline-block;
    }

    p::after {
      --m-i: linear-gradient(#000, #000);
      --m-o: content-box, padding-box;
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      padding: var(--border-width);
      background-image: conic-gradient(#ff0080, #ff0080, #ff0080, #ff0080, #ff0080, #ff0080, #ff0080);
      -webkit-mask-image: var(--m-i), var(--m-i);
      mask-image: var(--m-i), var(--m-i);
      -webkit-mask-origin: var(--m-o);
      mask-origin: var(--m-o);
      mask-clip: var(--m-o);
      mask-composite: exclude;
      -webkit-mask-composite: destination-out;
      filter: hue-rotate(0);
      animation: rotate-hue634 linear 500ms infinite;
      animation-play-state: paused;
      border-radius: 20px;
      border-color: #000;
    }

    p:hover::after {
      animation-play-state: running;
      border-radius: 10px;
    }

    @keyframes rotate-hue634 {
      to {
        filter: hue-rotate(1turn);
      }
    }

    p,
    p::after {
      box-sizing: border-box;
      border-radius: 20px;
    }

    p:hover {
      --border-width: 5px;
    }

    .tag {
      padding: 0.9em 1.6em;
      border: none;
      outline: none;
      cursor: pointer;
      position: relative;
      z-index: 0;
      border-radius: 32px;
    }

    .tag::after {
      content: '';
      z-index: -1;
      position: absolute;
      width: 100%;
      height: 100%;
      background-color: rgb(46, 46, 46);
      left: 0;
      top: 0;
      border-radius: 10px;
    }

    .tag::before {
      content: '';
      background: linear-gradient(45deg, #07d888, #e40851, #2f00ff, #00ff37, #ec0808, #2600ff, #0bd157, #2f00ff);
      position: absolute;
      top: -2px;
      left: -2px;
      background-size: 600%;
      z-index: -1;
      width: calc(100% + 4px);
      height: calc(100% + 4px);
      filter: blur(8px);
      animation: glowing345 20s linear infinite;
      transition: opacity 0.3s ease-in-out;
      border-radius: 20px;
      opacity: 0;
    }

    @keyframes glowing345 {
      0% {
        background-position: 0 0;
      }

      50% {
        background-position: 400% 0;
      }

      100% {
        background-position: 0 0;
      }
    }

    .tag:hover::before {
      opacity: 1;
    }

    .tag:active:after {
      background: transparent;
    }

    .tag:hover {
      color: $color-bg;
    }
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
