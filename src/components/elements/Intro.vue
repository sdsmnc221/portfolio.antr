<script setup>
import { onMounted, ref } from 'vue';
import { sample, shuffle } from '@utils';

const props = defineProps({
  head: {
    type: String,
    required: true,
  },
  shortText: {
    type: String,
    default: '',
  },
  qualityTerms: {
    type: Array,
    default: () => [],
  },
});

const introText = ref(null);
const ch = ref(5);

const animTerms = (textNode, shuffleNode, oldTerm = '') => {
  let inc = 0;
  let out = 0;
  let str = sample(oldTerm ? props.qualityTerms.filter((term) => term !== oldTerm) : props.qualityTerms).trim();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@$%&,.';
  let t;

  switch (str.length) {
    case 4:
      ch.value = 4;
      break;
    case 8:
      ch.value = str.length - 1;
      break;
    default:
      ch.value = str.length - 0.5;
      break;
  }

  const anim = () => {
    inc++;
    if (inc % 4 === 0 && out < str.length) {
      textNode.appendChild(document.createTextNode(str[out]));
      shuffleNode.innerHTML = '';
      out++;
    } else if (out >= str.length) {
      shuffleNode.innerHTML = '';
      clearInterval(t);
      setTimeout(() => animTerms(textNode, shuffleNode, str), 600);
    } else {
      shuffleNode.innerHTML = sample(shuffle(chars));
    }
  };

  t = setInterval(anim, 50);

  textNode.innerHTML = '';
};

const scrollContentToView = () => document.body.querySelector('.content').scrollIntoView({ behavior: 'smooth' });

onMounted(() => {
  if (introText.value) {
    const mainNode = introText.value.querySelector('strong em');

    if (mainNode) {
      mainNode.innerHTML = '';

      const textNode = document.createElement('span');
      textNode.classList.add('.text');
      mainNode.appendChild(textNode);

      const shuffleNode = document.createElement('span');
      shuffleNode.classList.add('.shuffle');
      mainNode.appendChild(shuffleNode);

      animTerms(textNode, shuffleNode);
    }
  }
});
</script>

<template>
  <header class="intro" :style="`--ch: ${ch}ch;}`">
    <div class="intro__head" v-html="head"></div>
    <div class="intro__text" v-html="shortText" ref="introText"></div>
    <div class="intro__down" @click="scrollContentToView">
      <span class="arrow">&#8595;</span>
      <span class="text">SELECTED WORKS</span>
    </div>
    <img class="intro__decor" src="/img/grid.svg" alt="" />
  </header>
</template>

<style lang="scss">
.intro {
  --ch: 5ch;

  padding: 2rem;

  &__head {
    h1 {
      font-size: $ft-s-xlarge;
      margin-top: 0;

      strong {
        color: $color-link-blue;
        font-weight: 700;
      }

      em {
        font-family: $pinyon;
        font-size: calc($ft-s-xlarge * 1.4);
        font-style: normal;
        color: $color-link-pink;
        display: block;
      }
    }
  }

  &__text {
    max-width: 66vw;
    position: relative;

    padding: 1rem 1.3rem;
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
      opacity: 1;
    }

    p {
      font-size: $ft-s-small;
      text-transform: lowercase;
      line-height: $ft-s-medium;
      margin-top: 0.48rem;

      strong,
      strong em {
        font-family: $montserrat;
        font-size: $ft-s-small;
        font-weight: 700;
        color: $color-link-blue;
      }

      strong em {
        display: inline-block;
        width: var(--ch);
        transition: all ease 0.4s;
      }

      em {
        font-style: normal;
        font-family: $pinyon;
        font-size: calc($ft-s-medium * 1.2);
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

  &__down {
    display: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    position: relative;
    font-weight: 400;
    line-height: 1;
    padding: 2rem;
    margin-top: 2rem;
    cursor: pointer;
    font-family: $montserrat;
    justify-content: center;
    align-items: center;
    flex-direction: column;

    .arrow {
      position: relative;
      font-size: $ft-s-xlarge;
      padding: 1.4rem;
      padding-top: 1.2rem;
      margin-bottom: 1rem;
      width: 12vw;
      height: 12vw;
      color: $color-link-blue;
      display: flex;
      justify-content: center;
      align-items: center;

      &::after {
        content: '';
        display: block;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 120%;
        height: 120%;
        border: 1px solid $color-light-pink;
        animation: blink 0.4s linear infinite;
      }

      &::before {
        content: '';
        display: block;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(45deg);
        width: 140%;
        height: 140%;
        border: 1px solid $color-light-blue;
      }
    }

    .text {
      position: absolute;
      top: 33%;
      right: 27%;
      font-size: 0.48rem;
      display: block;
      background-color: $color-link-blue;
      color: $color-bg;
      padding: 0.1rem;
    }
  }

  @media #{$mq-mobile} {
    height: 100vh;

    &__head {
      h1 {
        font-size: $ft-s-small;

        em {
          font-size: calc($ft-s-large * 0.88);
        }
      }
    }

    &__text {
      max-width: 84vw;

      p,
      p strong,
      p strong em {
        font-size: $ft-s-xsmall;
      }

      p em {
        font-size: $ft-s-medium;
      }
    }

    &__down {
      display: flex;
    }
  }
}
</style>
