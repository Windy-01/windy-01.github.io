<template>
  <DocumentMain class="home-document-main">
    <!-- 聊天内容占位：可在此处实现对话界面。 -->
    <section class="page-chat" aria-label="聊天内容">
      <h1 class="page-chat__title">Chat</h1>
      <p class="page-chat__hint">聊天功能即将上线。</p>
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

.page-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 480px;
  color: #1e293b;
  text-align: center;
  justify-content: center;
}

:global(.dark-mode) .page-chat {
  color: #e2e8f0;
}

.page-chat__title {
  margin: 0;
  font-size: 2rem;
}

.page-chat__hint {
  margin: 0;
  color: #64748b;
}
</style>
