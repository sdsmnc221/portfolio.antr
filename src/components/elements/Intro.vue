<script setup>
const props = defineProps({
  head: {
    type: String,
    required: true,
  },
  shortText: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <header class="intro">
    <div class="intro__head" v-html="head"></div>
    <div class="intro__text" v-html="shortText"></div>
    <img class="intro__decor" src="/img/grid.svg" alt="" />
  </header>
</template>

<style lang="scss">
.intro {
  padding: 2rem;

  &__head {
    h1 {
      font-size: $ft-s-xlarge;
      margin-top: 0;

      strong,
      em {
        font-weight: 700;
      }

      strong {
        color: $color-link-blue;
      }

      em {
        font-style: normal;
        color: $color-link-pink;
        display: block;
      }
    }
  }

  &__text {
    max-width: 64vw;
    position: relative;

    padding: 1rem;
    background-color: white;

    &::after {
      content: '';
      display: block;
      position: absolute;
      width: 100%;
      height: 100%;
      background: linear-gradient(60deg, $color-link-blue 90%, $color-link-pink 100%);
      top: 0;
      left: -100%;
      mix-blend-mode: overlay;
    }

    p {
      font-size: $ft-s-small;
      text-transform: lowercase;
      line-height: $ft-s-medium;
      margin-top: 0.48rem;

      strong,
      em {
        font-weight: 700;
      }

      strong {
        color: $color-link-blue;
      }

      em {
        font-style: normal;
        color: $color-link-pink;
      }
    }
  }

  &__decor {
    position: absolute;
    right: 0;
    top: 0;
    width: 36vw;
    height: auto;
    mix-blend-mode: screen;
    pointer-events: none;
    user-select: none;
  }

  @media #{$mq-mobile} {
    &__head {
      h1 {
        font-size: $ft-s-small;
      }
    }

    &__text {
      max-width: 84vw;
      p {
        font-size: $ft-s-xsmall;
      }
    }
  }
}
</style>
