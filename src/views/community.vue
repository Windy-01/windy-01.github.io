<template>
  <DocumentMain class="home-document-main">
    <!-- 社区内容占位：可在此处实现社区界面。 -->
    <section class="page-community" aria-label="社区内容">
      <h1 class="page-community__title">Community</h1>
      <p class="page-community__hint">社区功能即将上线。</p>
    </section>
  </DocumentMain>
</template>

<script setup lang="ts">
import DocumentMain from '../components/layout/DocumentMain.vue'
</script>

<style scoped>
.home-document-main {
  flex: 0 0 auto;
  flex-shrink: 0;
  margin: 0;
}

@media (max-width: 768px) {
  .home-document-main {
    width: 100%;
    margin: 0;
  }
}

.page-community {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 480px;
  color: #1e293b;
  text-align: center;
}

:global(.dark-mode) .page-community {
  color: #e2e8f0;
}

.page-community__title {
  margin: 0;
  font-size: 2rem;
}

.page-community__hint {
  margin: 0;
  color: #64748b;
}
</style>
