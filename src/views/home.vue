<template>
  <main class="home-content">
    <div class="home-search-content">
      <Clock class="home-clock" />
      <SearchBox />
    </div>
  </main>
</template>

<script setup lang="ts">
import Clock from '../components/common/Clock.vue'
import SearchBox from '../components/common/SearchBox.vue'
</script>

<style scoped>
.home-content {
  display: flex;
  flex: 1 1 auto;
  justify-content: center;
  min-height: calc(100vh - var(--header-height) - var(--header-gap) * 2);
}

.home-search-content {
  display: flex;
  align-items: center;
  width: min(100%, 820px);
  margin-top: clamp(32px, 10vh, 112px);
  gap: 24px;
  flex-direction: column;
}

.home-clock {
  display: block;
  justify-content: center;
}

@media (max-width: 768px) {
  .home-content {
    flex: 1 1 auto;
    width: 100%;
    /* 移动端没有底部留白，只扣顶栏高度 + 间距 */
    min-height: calc(100vh - var(--header-height) - var(--header-gap));
  }

  .home-search-content {
    width: 100%;
    margin-top: clamp(24px, 8vh, 72px);
    padding: 0 8px;
  }
}
</style>
