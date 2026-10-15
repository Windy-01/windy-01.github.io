<template>
  <DocumentReader :source="readmeSource" aria-label="关于" />
</template>

<script setup lang="ts">
import DocumentReader from '../components/common/DocumentReader.vue'
// 关于页的内容就是仓库根目录的 README，纯静态文件，不走后端接口。
import readmeSource from '../../README.md?raw'
</script>
