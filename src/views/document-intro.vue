<template>
  <DocumentReader :source="documentIntroSource" aria-label="文档说明" />
</template>

<script setup lang="ts">
import DocumentReader from '../components/common/DocumentReader.vue'
// 说明页是纯静态文案，不请求任何接口；帖子的数据源在 `src/api/posts.ts`。
import { documentIntroSource } from '../api/documents'
</script>
