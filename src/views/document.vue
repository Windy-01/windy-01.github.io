<template>
  <DocumentMain class="home-document-main">
    <!-- 文档内容来自 tmp/markdown-test.md，后续接入真实文档时替换数据源即可。 -->
    <MarkdownView :source="markdownTestSource" aria-label="文档内容" />
  </DocumentMain>
</template>

<script setup lang="ts">
import MarkdownView from '../components/common/MarkdownView.vue'
import DocumentMain from '../components/layout/DocumentMain.vue'
import markdownTestSource from '../../tmp/markdown-test.md?raw'
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
</style>
