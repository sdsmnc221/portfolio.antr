<script setup>
import Tag from './Tag.vue';

const props = defineProps({
  hashtagsTitle: {
    type: String,
    required: true,
  },
  hashtags: {
    type: Array,
    default: () => [],
  },
  resumeTitle: {
    type: String,
    required: true,
  },
  resumeLink: {
    type: String,
    required: true,
  },
  resumeQR: {
    type: Object,
    default: () => {},
  },
  contactTitle: {
    type: String,
    required: true,
  },
  contactLink: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <footer class="outro">
    <div class="flex">
      <div class="outro__hashtags">
        <p class="outro__hashtags_title">{{ hashtagsTitle }}</p>
        <Tag v-for="(tag, index) in hashtags" :key="`outro-hashtag-${tag}-${index}`" :text="tag" />
      </div>

      <div class="outro__resume">
        <div class="container">
          <div class="box">
            <span class="title">{{ resumeTitle }}</span>
            <a class="outro__resume-qr" :href="resumeLink" target="_blank">
              <img :src="resumeQR.filename" alt="Linktree An TRUONG" />
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="outro__contact">
      <p class="outro__contact-title">
        <a :href="contactLink" target="_blank">
          {{ contactTitle }}
        </a>
      </p>
    </div>

    <img class="outro__decor" src="/img/grid.svg" alt="" />
  </footer>
</template>

<style lang="scss" scoped>
.outro {
  padding: 2rem;
  font-size: $ft-s-medium;
  padding-bottom: 4rem;
  position: relative;

  &__decor {
    position: absolute;
    left: 0;
    top: 0;
    width: 36vw;
    height: auto;
    mix-blend-mode: screen;
    pointer-events: none;
    user-select: none;
    z-index: -1;
  }

  .flex {
    margin: 0 auto;
    width: 72vw;
    display: flex;
    justify-content: space-around;
    align-items: center;

    .outro__hashtags {
      margin-right: 3.2rem;

      &_title {
        padding: 1rem;
        background-color: white;
        position: relative;
        margin-bottom: 1rem;

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
      }
    }

    .outro__resume {
      .container .box {
        position: relative;
        width: 320px;
        padding: 2rem;
        border-radius: 32px;
        background: $color-bg;
        box-shadow: 15px 15px 30px #bebebe, -15px -15px 30px #ffffff;

        &::after {
          content: '';
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(60deg, $color-link-blue 0%, $color-link-pink 100%);
          mix-blend-mode: overlay;
          border-radius: 32px;
          pointer-events: none;
        }

        &:hover {
          box-shadow: inset 15px 15px 30px #bebebe, -15px -15px 30px #ffffff;
        }
      }

      .container .box {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .container .box .title {
        font-size: $ft-s-small;
        text-align: center;
        margin-bottom: 1rem;
        letter-spacing: 0.1em;
      }

      img {
        display: block;
        width: 100%;
        height: auto;
      }
    }
  }

  &__contact {
    position: relative;
    width: 48vw;
    margin: 2rem auto;
    margin-top: 4rem;
    text-align: center;
    font-size: $ft-s-large;
    color: #090909;
    padding: 0.7em 1.7em;
    border-radius: 32px;
    background: #e8e8e8;
    border: 1px solid #e8e8e8;
    transition: all 0.3s;
    box-shadow: 15px 15px 30px #bebebe, -15px -15px 30px #ffffff;
    font-family: $major-mono;
    font-weight: 700;

    &::after {
      content: '';
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(60deg, $color-link-blue 0%, $color-link-pink 100%);
      mix-blend-mode: overlay;
      border-radius: 32px;
      pointer-events: none;
    }

    &:hover {
      color: #666;
      box-shadow: inset 15px 15px 30px #bebebe, -15px -15px 30px #ffffff;
    }
  }

  @media #{$mq-mobile} {
    * {
      font-size: $ft-s-small !important;
    }

    .flex {
      flex-direction: column;
      justify-content: center;
      align-items: center;

      .outro__hashtags {
        margin-bottom: 2rem;
      }

      .outro__resume {
        .container .box {
          width: 240px;
        }
      }
    }

    &__contact {
      width: 240px;
      padding: 2rem 1rem;
    }
  }

  @media #{$mq-mobile} {
    .flex {
      .outro__hashtags {
        margin-right: 0;

        .tag {
          font-size: $ft-s-xsmall !important;
        }
      }
    }
  }
}
</style>
