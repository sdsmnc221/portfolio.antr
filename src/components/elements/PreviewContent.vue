<script setup>
const props = defineProps({
  content: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <div class="preview__content" :class="variant">
    <div class="preview__content_lg">
      <p class="preview__content_sl"></p>
      <p class="preview__content_text" v-html="content" />
    </div>
  </div>
</template>

<style lang="scss">
.preview__content {
  -moz-appearance: none;
  -webkit-appearance: none;
  appearance: none;
  border: none;
  background: none;
  color: $color-text;
  cursor: pointer;
  position: relative;
  padding: 8px;
  margin-bottom: 20px;
  line-height: $ft-s-medium;
  font-weight: bold;
  margin: 0 16vw;

  @media #{$mq-mobile} {
    margin: 24px;

    &.pink {
      .preview__content_lg {
        background-color: $color-link-pink;
      }
    }

    &.blue {
      .preview__content_lg {
        background-color: $color-link-blue;
      }
    }

    &.pink,
    &.blue {
      .preview__content_sl {
        background-color: $color-text !important;
        transform: skew(-8deg) !important;
      }
    }
  }

  &.pink {
    .preview__content_sl {
      background-color: $color-link-pink;
    }

    .preview__content_text {
      a {
        color: $color-light-blue;

        &:hover {
          color: $color-light-pink;
        }
      }
    }
  }

  &.blue {
    .preview__content_sl {
      background-color: $color-link-blue;
    }

    .preview__content_text {
      a {
        color: $color-light-pink;

        &:hover {
          color: $color-light-blue;
        }
      }
    }
  }
}

.preview__content::before,
.preview__content::after {
  content: '';
  display: block;
  position: absolute;
  right: 0;
  left: 0;
  height: calc(50% - 5px);
  border: 1px solid #7d8082;
  transition: all 0.15s ease;
  pointer-events: none;
}

.preview__content::before {
  top: 0;
  border-bottom-width: 0;
}

.preview__content::after {
  bottom: 0;
  border-top-width: 0;
}

.preview__content:active,
.preview__content:focus {
  outline: none;
}

.preview__content:active::before,
.preview__content:active::after {
  right: 3px;
  left: 3px;
}

.preview__content:active::before {
  top: 3px;
}

.preview__content:active::after {
  bottom: 3px;
}

.preview__content_lg {
  position: relative;
  display: block;
  padding: 10px 20px;
  color: #fff;
  background-color: $color-text;
  overflow: hidden;
  box-shadow: inset 0px 0px 0px 1px transparent;
}

.preview__content_lg::before {
  content: '';
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 2px;
  background-color: $color-text;
}

.preview__content_lg::after {
  content: '';
  display: block;
  position: absolute;
  right: 0;
  bottom: 0;
  width: 4px;
  height: 4px;
  background-color: $color-text;
  transition: all 0.2s ease;
}

.preview__content_sl {
  display: block;
  position: absolute;
  top: 0;
  bottom: -1px;
  left: -64px;
  width: 0;
  transform: skew(-15deg);
  transition: all 0.2s ease;
}

.preview__content_text {
  position: relative;

  p:not(:first-of-type) {
    margin-top: 1rem;
  }
}

.preview__content:hover {
  color: $color-text;
}

.preview__content:hover .preview__content_sl {
  width: calc(132% + 15px);
}

.preview__content:hover .preview__content_lg::after {
  background-color: #fff;
}
</style>
