<script setup>
import RowItem from './RowItem.vue';
import PreviewItem from './PreviewItem.vue';
import PreviewImage from '@elements/PreviewImage.vue';

import { Row } from './row';

import { onMounted, ref, watch } from 'vue';

import gsap from 'gsap-bonus';
import { Flip } from 'gsap-bonus/Flip';
gsap.registerPlugin(Flip);

const triggerAnim = new CustomEvent('trigger-anim');

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
});

const bigImg = ref('');

const activeRow = ref(0);

const resetPreviewImage = () => (bigImg.value = '');

const setActiveRow = (index) => (activeRow.value = index);

const initAnim = () => {
  // preview Items
  const previewItems = [...document.querySelectorAll('.preview > .preview__item')];
  // initial rows
  const rows = [...document.querySelectorAll('.row')];
  // cover element
  const cover = document.querySelector('.cover');
  // close ctrl
  const closeCtrl = document.querySelector('.preview > .preview__close');
  const body = document.body;

  // Row instance array
  let rowsArr = [];
  rows.forEach((row, position) => {
    rowsArr.push(new Row(row, previewItems[position]));
  });

  let isOpen = false;
  let isAnimating = false;
  let currentRow = -1;
  let mouseenterTimeline;

  for (const row of rowsArr) {
    row.DOM.allImages.forEach((cellImage) =>
      cellImage.addEventListener('click', () => {
        bigImg.value = cellImage.getAttribute('data-img');
      })
    );

    row.DOM.el.addEventListener('mouseenter', () => {
      if (isOpen) return;

      gsap.killTweensOf([row.DOM.images, row.DOM.title]);

      mouseenterTimeline = gsap
        .timeline()
        .addLabel('start', 0)
        .to(
          row.DOM.marquee,
          {
            height: 'auto',
            scaleY: 1,

            duration: 0.4,
            ease: 'expo',
          },
          'start'
        )
        .to(
          row.DOM.year,
          {
            duration: 0.4,
            ease: 'expo',
            yPercent: -100,
            rotation: -15,
            opacity: 0,
          },
          'start'
        )
        .to(
          row.DOM.images,
          {
            duration: 0.4,
            ease: 'power3',
            startAt: {
              scale: 0.8,
              xPercent: 20,
            },
            scale: 1,
            xPercent: 0,
            opacity: 1,
            stagger: -0.035,
          },
          'start+=0.4'
        )
        .set(row.DOM.title, { transformOrigin: '0% 50%' }, 'start')
        .to(
          row.DOM.title,
          {
            duration: 0.1,
            ease: 'power1.in',
            yPercent: -100,
            onComplete: () => row.DOM.titleWrap.classList.add('cell__title--switch'),
          },
          'start'
        )
        .to(
          row.DOM.title,
          {
            duration: 0.5,
            ease: 'expo',
            startAt: {
              yPercent: 100,
              rotation: 15,
            },
            yPercent: 0,
            rotation: 0,
          },
          'start+=0.1'
        );
    });

    row.DOM.el.addEventListener('mouseleave', () => {
      if (isOpen) return;

      gsap.killTweensOf([row.DOM.images, row.DOM.title]);

      gsap
        .timeline()
        .addLabel('start')
        .to(
          row.DOM.marquee,
          {
            height: 0,
            scaleY: 0,

            duration: 0.4,
            ease: 'expo',
          },
          'start'
        )
        .to(
          row.DOM.year,
          {
            duration: 0.4,
            ease: 'expo',
            yPercent: -50,
            rotation: 0,
            opacity: 1,
          },
          'start'
        )
        .to(
          row.DOM.images,
          {
            duration: 0.4,
            ease: 'power4',
            opacity: 0,
            scale: 0.8,
          },
          'start'
        )
        .to(
          row.DOM.title,
          {
            duration: 0.1,
            ease: 'power1.in',
            yPercent: -100,
            onComplete: () => row.DOM.titleWrap.classList.remove('cell__title--switch'),
          },
          'start'
        )
        .to(
          row.DOM.title,
          {
            duration: 0.5,
            ease: 'expo',
            startAt: {
              yPercent: 100,
              rotation: 15,
            },
            yPercent: 0,
            rotation: 0,
          },
          'start+=0.1'
        );
    });

    // Open a row and reveal the grid
    row.DOM.el.addEventListener('click', () => {
      let previewArr = [];
      if (row.previewItem.DOM.content) previewArr.push(row.previewItem.DOM.content);
      if (row.previewItem.DOM.video) previewArr.push(row.previewItem.DOM.video);
      if (row.previewItem.DOM.hashtags) previewArr.push(row.previewItem.DOM.hashtags);

      if (isAnimating) return;
      isAnimating = true;

      isOpen = true;

      currentRow = rowsArr.indexOf(row);

      gsap.killTweensOf([cover, rowsArr.map((row) => row.DOM.title)]);

      gsap
        .timeline({
          onStart: () => {
            body.classList.add('oh');
            row.DOM.el.classList.add('row--current');
            row.previewItem.DOM.el.classList.add('preview__item--current');

            gsap.set(row.previewItem.DOM.images, { opacity: 0 });

            // set cover to be on top of the row and then animate it to cover the whole page
            gsap.set(cover, {
              height: row.DOM.el.offsetHeight - 1, // minus border width
              top: row.DOM.el.getBoundingClientRect()['top'],
              opacity: 1,
            });

            gsap.set(row.previewItem.DOM.title, {
              yPercent: -100,
              rotation: 15,
              transformOrigin: '100% 50%',
            });

            gsap.set(row.previewItem.DOM.button, { opacity: 0 });

            gsap.set(previewArr, {
              opacity: 0,
              scale: 0,
            });

            closeCtrl.classList.add('preview__close--show');

            document.body.classList.add('-hide-gradient');
          },
          onComplete: () => (isAnimating = false),
        })
        .addLabel('start', 0)
        .to(
          cover,
          {
            duration: 0.9,
            ease: 'power4.inOut',
            height: window.innerHeight,
            top: 0,
            onComplete: () => (cover.style.minHeight = '240vh'),
          },
          'start'
        )
        // animate all the titles out
        .to(
          rowsArr.map((row) => row.DOM.title),
          {
            duration: 0.5,
            ease: 'power4.inOut',
            yPercent: (_, target) => {
              return target.getBoundingClientRect()['top'] > row.DOM.el.getBoundingClientRect()['top'] ? 100 : -100;
            },
            rotation: 0,
          },
          'start'
        )
        .add(() => {
          mouseenterTimeline.progress(1, false);
          const flipstate = Flip.getState(row.DOM.images, { simple: true });
          row.previewItem.DOM.grid.prepend(...row.DOM.images);
          Flip.from(flipstate, {
            duration: 0.9,
            ease: 'power4.inOut',
            //absoluteOnLeave: true,
            stagger: 0.04,
          })
            // other images in the grid
            .to(
              row.previewItem.DOM.images,
              {
                duration: 0.9,
                ease: 'power4.inOut',
                startAt: { scale: 0, yPercent: () => gsap.utils.random(0, 200) },
                scale: 1,
                opacity: 1,
                yPercent: 0,
                stagger: 0.04,
              },
              0.04 * row.DOM.images.length
            );
        }, 'start')
        .to(
          row.previewItem.DOM.title,
          {
            duration: 1,
            ease: 'power4.inOut',
            yPercent: 0,
            rotation: 0,
            onComplete: () => row.DOM.titleWrap.classList.remove('cell__title--switch'),
          },
          'start'
        )
        .to(
          row.previewItem.DOM.button,
          {
            duration: 1,
            ease: 'power4.inOut',
            opacity: 1,
            yPercent: 0,
          },
          'start+=0.2'
        )
        .to(
          closeCtrl,
          {
            duration: 1,
            ease: 'power4.inOut',
            opacity: 1,
          },
          'start'
        )
        .to(
          previewArr,
          {
            scale: 1,
            opacity: 1,
            stagger: 0.04,
            duration: 1.6,
            ease: 'power4.inOut',
          },
          'start'
        );
    });
  }

  // Close the grid and show back the rows
  closeCtrl.addEventListener('click', () => {
    if (isAnimating) return;
    isAnimating = true;

    isOpen = false;

    const row = rowsArr[currentRow];
    let previewArr = [];
    if (row.previewItem.DOM.content) previewArr.push(row.previewItem.DOM.content);
    if (row.previewItem.DOM.video) previewArr.push(row.previewItem.DOM.video);
    if (row.previewItem.DOM.hashtags) previewArr.push(row.previewItem.DOM.hashtags);

    gsap
      .timeline({
        defaults: { duration: 0.5, ease: 'power4.inOut' },
        onStart: () => {
          body.classList.remove('oh', '-hide-gradient');
          row.DOM.el.classList.remove('row--current');
          closeCtrl.classList.remove('preview__close--show');
        },
        onComplete: () => {
          row.previewItem.DOM.el.classList.remove('preview__item--current');
          isAnimating = false;
        },
      })
      .addLabel('start', 0)
      .to(
        row.DOM.year,
        {
          duration: 0.4,
          ease: 'expo',
          yPercent: -50,
          rotation: 0,
          opacity: 1,
        },
        'start+=1'
      )
      .to(
        [row.DOM.images, row.previewItem.DOM.images],
        {
          scale: 0,
          opacity: 0,
          stagger: 0.04,
          onComplete: () => row.DOM.imagesWrap.prepend(...row.DOM.images),
        },
        0
      )
      .to(
        previewArr,
        {
          scale: 0,
          opacity: 0,
          stagger: 0.04,
        },
        'start'
      )
      .to(
        row.previewItem.DOM.button,
        {
          duration: 0.32,
          yPercent: 200,
          opacity: 0,
        },
        'start'
      )
      .to(
        row.previewItem.DOM.title,
        {
          duration: 0.6,
          yPercent: 200,
        },
        'start+=-.4'
      )
      .to(
        closeCtrl,
        {
          opacity: 0,
        },
        'start'
      )
      // animate cover out
      .to(
        cover,
        {
          ease: 'power4',
          height: 0, //,row.DOM.el.offsetHeight-1, // minus border width
          top: row.DOM.el.getBoundingClientRect()['top'] + row.DOM.el.offsetHeight / 2,
          onStart: () => (cover.style.minHeight = 0),
        },
        'start+=0.4'
      )
      // fade out cover
      .to(
        cover,
        {
          duration: 0.3,
          opacity: 0,
        },
        'start+=0.9'
      )
      // animate all the titles in
      .to(
        rowsArr.map((row) => row.DOM.title),
        {
          yPercent: 0,
          stagger: {
            each: 0.03,
            grid: 'auto',
            from: currentRow,
          },
        },
        'start+=0.4'
      );
  });
};

onMounted(() => {
  // setTimeout(() => initAnim(), 1200);
  window.addEventListener('trigger-anim', () => setTimeout(() => initAnim(), 1200));
});

watch(
  () => props.data,
  () => {
    window.dispatchEvent(triggerAnim);
  }
);
</script>

<template>
  <section class="content" :class="{ '-pink': data.length % 2 === 0, '-blue': data.length % 2 !== 0 }">
    <div class="cover" :class="{ '-pink': activeRow % 2 === 0, '-blue': activeRow % 2 !== 0 }"></div>
    <RowItem
      v-for="(project, index) in data"
      :key="`row-${index}`"
      :cell-text="project.previewTitle"
      :cell-images="project.rowImages"
      :year="project.year"
      :index="index"
      :hashtags="project.previewHashtags"
      @click="setActiveRow(index)"
    />
  </section>

  <section class="preview">
    <button class="preview__close unbutton">&#9587;</button>
    <PreviewItem
      v-for="(project, index) in data"
      :key="`preview-${index}`"
      :preview-title="project.previewTitle"
      :preview-images="project.previewImages"
      :preview-content="project.previewContent"
      :preview-video="project.previewVideo"
      :preview-hashtags="project.previewHashtags"
      :preview-link="project.previewLink"
      :index="index"
      :nb-images="project.previewImages.length + project.rowImages.length"
      :display-images="project.displayImages"
    />
  </section>

  <Transition name="fade">
    <PreviewImage v-if="bigImg" :img="bigImg" :on-click="resetPreviewImage" />
  </Transition>
</template>

<style lang="scss">
.cover {
  width: 100%;
  height: 0;
  opacity: 0;
  pointer-events: none;
  z-index: 10;
  position: fixed;
  left: 0;
  will-change: height, top;

  &.-pink {
    background: $color-bg-row-hover-pink;
  }

  &.-blue {
    background: $color-bg-row-hover-blue;
  }
}

.content {
  position: relative;
  z-index: 100;

  &.-pink {
    border-bottom: 1px solid $color-row-border-pink;
  }

  &.-blue {
    border-bottom: 1px solid $color-row-border-blue;
  }
}

.preview {
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 200;

  & #{&}__close {
    z-index: 10;
    position: absolute;
    top: 0;
    right: 0;
    font-size: 2rem;
    font-weight: 400;
    line-height: 1;
    padding: 2rem;
    cursor: pointer;
    opacity: 0;
    font-family: sans-serif;
  }

  & #{&}__close--show {
    pointer-events: auto;
  }
}

.oh {
  position: relative;
  overflow: hidden;

  &__inner {
    will-change: transform;
    display: inline-block;
  }
}

.cell {
  position: relative;

  &__title {
    --font-weight: 100;
    --weight-animation: 0.4s;

    margin: 0;
    font-size: clamp(1.2rem, 4vw, 2.8rem);
    position: relative;
    line-height: 1;
    font-family: $ibm-plex;
    font-weight: var(--font-weight);
    white-space: nowrap;
    text-transform: uppercase;
    transition: all 0.5s;
    animation: weight var(--weight-animation) ease-in-out infinite alternate;

    &--switch {
      font-family: $major-mono;
      font-weight: 700;
      animation: none;
    }
  }

  &--images {
    display: grid;
    align-content: center;
    grid-auto-columns: auto;
    grid-auto-flow: column;
    gap: $image-gap;
    justify-content: end;
    margin-left: auto;
  }

  &__img {
    width: $img-size;
    display: grid;
    position: relative;
    grid-template-columns: 100%;
    grid-template-rows: auto auto;
    will-change: transform, opacity;
    opacity: 0;
    cursor: pointer;

    &-inner {
      background-size: contain;
      background-position: 50% 50%;
      aspect-ratio: 1;
      width: 100%;
      border-radius: calc($image-gap) / 3;
      background-repeat: no-repeat;
    }
  }
}
</style>
