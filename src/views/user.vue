<template>
  <DocumentMain class="home-document-main">
    <!-- 占位内容：用户主页后续替换为真实资料。 -->
    <section class="page-user" aria-label="用户主页">
      <h1 class="page-user__title">user</h1>
      <p class="page-user__hint">用户主页：{{ userId }}</p>
    </section>
  </DocumentMain>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import DocumentMain from '../components/layout/DocumentMain.vue'

const route = useRoute()
const userId = computed(() => String(route.params.id ?? ''))
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

.page-user {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 480px;
  color: #1e293b;
  text-align: center;
}

:global(.dark-mode) .page-user {
  color: #e2e8f0;
}

.page-user__title {
  margin: 0;
  font-size: 2rem;
}

.page-user__hint {
  margin: 0;
  color: #64748b;
}
</style>
