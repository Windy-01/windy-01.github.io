<template>
  <div class="layout-background">
    <div class="layout-background__layer" aria-hidden="true">
      <img
        class="layout-background__image"
        :class="{ 'is-loaded': isBackgroundLoaded }"
        :src="backgroundImageUrl"
        alt=""
        decoding="async"
        @load="handleBackgroundLoad"
      />

      <!-- 编辑背景内容的位置：可在此处使用 background slot 放置背景图形或装饰。 -->
      <div class="layout-background__slot">
        <slot name="background" />
      </div>
    </div>

    <div class="layout-background__overlay" aria-hidden="true" />

    <div class="layout-background__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const backgroundImageUrl = 'https://www.loliapi.com/acg/pc/'
const isBackgroundLoaded = ref(false)

function handleBackgroundLoad() {
  isBackgroundLoaded.value = true
}
</script>

<style scoped>
.layout-background {
  position: relative;
  display: flex;
  min-height: 100vh;
  overflow: hidden;
}

.layout-background__layer,
.layout-background__overlay {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
}

.layout-background__layer {
  z-index: 0;
  overflow: hidden;
  background-color: #e2e8f0;
}

.layout-background__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0;
  transition: opacity 0.6s ease;
}

.layout-background__image.is-loaded {
  opacity: 1;
}

.layout-background__slot {
  position: relative;
  z-index: 1;
}

.layout-background.dark-mode .layout-background__layer {
  background-color: #0f172a;
}

@media (prefers-reduced-motion: reduce) {
  .layout-background__image {
    transition: none;
  }
}

.layout-background__overlay {
  z-index: 1;
  background-color: rgb(255 255 255 / 72%);
  pointer-events: none;
}

.layout-background.dark-mode .layout-background__overlay {
  background-color: rgba(75, 75, 75, 0.72);
}

.layout-background__content {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 100vh;
}
</style>
