<script setup></script>

<template>
  <div class="loader">
    <div class="item1"></div>
    <div class="item2"></div>
    <div class="item3"></div>
  </div>
</template>

<style lang="scss" scoped>
.loader {
  width: 100vw;
  height: 100%;
  background-color: $color-bg;
  position: fixed;
  overflow: hidden;
  z-index: 999;
  top: 0;
  left: 0;

  &::after {
    content: '';
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    min-height: 100vh;
    background: linear-gradient(60deg, $color-link-blue 0%, $color-link-pink 100%);
    mix-blend-mode: overlay;
    z-index: -1;
    opacity: 1;
  }
}

img,
.item1,
.item2,
.item3 {
  position: absolute;
  background-color: transparent;
  left: calc(50% - (var(--size) / 2));
  top: calc(50% - (var(--size) / 2));
  height: var(--size);
  width: var(--size);
  border-radius: 0;
  background-image: url('/img/logo.svg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.loader .item1 {
  --size: 120px;
  animation: size1_1 2.5s infinite alternate;
  z-index: 1;
}

.loader .item2 {
  --size: 90px;
  animation: size1_2 2.5s infinite alternate;
  z-index: 2;
}

.loader .item3 {
  --size: 60px;
  animation: size1_3 2.5s infinite alternate;
  z-index: 3;
}

@keyframes size1_1 {
  0%,
  10% {
    transform: scale(0);
  }

  100% {
    transform: scale(1);
    box-shadow: 8px 8px 14px #c5c5c5, -8px -8px 14px #ffffff;
  }
}

@keyframes size1_2 {
  0%,
  40% {
    transform: scale(0);
  }

  100% {
    transform: scale(1);
    box-shadow: 8px 8px 14px #c5c5c5, -8px -8px 14px #ffffff;
  }
}

@keyframes size1_3 {
  0%,
  70% {
    transform: scale(0);
  }

  100% {
    transform: scale(1);
    box-shadow: 8px 8px 14px #c5c5c5, -8px -8px 14px #ffffff;
  }
}
</style>
