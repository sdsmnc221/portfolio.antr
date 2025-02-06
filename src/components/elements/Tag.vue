<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <p class="tag">#{{ text }}</p>
</template>

<style lang="scss" scoped>
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

  left: 0;
  top: 0;
  border-radius: 10px;
}

.tag::before {
  content: '';
  background: linear-gradient(
    45deg,
    #b5d8f0,
    /* pastel blue */ #e8a5c6,
    /* pastel pink/rose */ #b5c9e8,
    /* light blue */ #e8bed3,
    /* light rose */ #a5c0e8,
    /* soft blue */ #e8c5d6,
    /* soft pink */ #c5d8e8,
    /* pale blue */ #e8d0db /* pale rose */
  );
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
</style>
