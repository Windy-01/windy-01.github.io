<template>
  <DocumentReader
    :source="document?.source ?? ''"
    :loading="loading"
    :error="error"
    :aria-label="document?.title ?? '文档内容'"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import DocumentReader from '../components/common/DocumentReader.vue'
import { fetchDocument } from '../api/documents'
import type { DocumentDetail } from '../api/documents'

const route = useRoute()

/** 文档 id 来自路由参数 `/document/:id`。 */
const documentId = computed(() => String(route.params.id ?? ''))

const document = ref<DocumentDetail | null>(null)
const loading = ref(false)
const error = ref('')

/** 请求序号：只认最后一次发起的请求，避免快速切换 id 时旧响应覆盖新内容。 */
let requestToken = 0

async function loadDocument(id: string) {
  const token = ++requestToken

  loading.value = true
  error.value = ''
  document.value = null

  try {
    const detail = await fetchDocument(id)

    if (token !== requestToken) {
      return
    }

    document.value = detail
  } catch (cause) {
    if (token !== requestToken) {
      return
    }

    error.value = cause instanceof Error ? cause.message : '文档加载失败。'
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

// 从 /document/a 切到 /document/b 时组件实例会被复用，必须监听 id 变化。
watch(documentId, (id) => {
  void loadDocument(id)
}, { immediate: true })
</script>
