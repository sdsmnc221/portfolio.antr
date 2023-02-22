<script setup>
const props = defineProps({
  cellText: {
    type: String,
    required: true,
  },
  cellImages: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <div class="row">
    <div class="cell cell--text">
      <h2 class="cell__title oh">
        <span class="oh__inner">{{ cellText }}</span>
      </h2>
    </div>
    <div class="cell cell--images">
      <div
        v-for="(image, index) in cellImages"
        :key="`cell-image-${cellText}-${index}`"
        class="cell__img"
        :data-img="image"
      >
        <div class="cell__img-inner" :style="`background-image: url(${image})`"></div>
      </div>
    </div>
    <div class="cell cell--year">2022</div>
  </div>
</template>

<style lang="scss">
.row {
  z-index: 1;
  color: $color-text;
  display: grid;
  position: relative;
  cursor: pointer;
  grid-template-rows: $img-size;
  grid-template-columns: auto 1fr;
  grid-column-gap: 5vw;
  align-items: center;
  padding: $padding-row $padding-sides;
  border-top: 1px solid $color-row-border;
  transition: background-color 0.3s ease-out, border-color 0.3s ease-out;

  &:hover {
    background-color: $color-bg-row-hover;
  }

  &--current {
    z-index: 11;
    transition: border-color 0.3s ease-out;
  }

  .cell {
    &--year {
      position: absolute;
      top: 50%;
      right: 4vw;
      transform: translateY(-50%);
    }
    &--images {
      pointer-events: none;
    }
  }
}
</style>
