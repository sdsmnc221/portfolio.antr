<script setup>
const props = defineProps({
  hashtags: {
    type: Array,
    required: true,
  },
  rowIndex: {
    type: Number,
    required: true,
  },
});
</script>

<template>
  <div class="marquee" :class="{ '-pink': rowIndex % 2 === 0, '-blue': rowIndex % 2 !== 0 }">
    <div class="marquee__inner" aria-hidden="true">
      <span v-for="(tag, index) in hashtags" :key="`marquee-hashtag-row-${rowIndex}-${tag}-${index}-1`"
        >#{{ tag }}</span
      >
      <span v-for="(tag, index) in hashtags" :key="`marquee-hashtag-row-${rowIndex}-${tag}-${index}-2`"
        >#{{ tag }}</span
      >
      <span v-for="(tag, index) in hashtags" :key="`marquee-hashtag-row-${rowIndex}-${tag}-${index}-3`"
        >#{{ tag }}</span
      >
      <span v-for="(tag, index) in hashtags" :key="`marquee-hashtag-row-${rowIndex}-${tag}-${index}-4`"
        >#{{ tag }}</span
      >
    </div>
  </div>
</template>

<style lang="scss" scoped>
.marquee {
  position: relative;
  overflow: hidden;
  --offset: 20vw;
  --move-initial: calc(-25% + var(--offset));
  --move-final: calc(-50% + var(--offset));
  transform: scaleY(0);
  height: 0;

  &.-pink {
    border-top: 0 solid $color-link-blue;
    background-color: $color-link-pink;
  }

  &.-blue {
    border-top: 0 solid $color-link-pink;
    background-color: $color-link-blue;
  }

  &__inner {
    width: fit-content;
    display: flex;
    position: relative;
    transform: translate3d(var(--move-initial), 0, 0);
    animation: marquee 7.2s linear infinite;
  }

  span {
    font-family: $major-mono;
    padding: 1vh 2vw;
    width: max-content;
    color: $color-bg;
  }

  @keyframes marquee {
    0% {
      transform: translate3d(var(--move-initial), 0, 0);
    }

    100% {
      transform: translate3d(var(--move-final), 0, 0);
    }
  }
}
</style>
