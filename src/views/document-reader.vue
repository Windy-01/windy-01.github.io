<template>
  <DocumentReader
    :source="document?.source ?? ''"
    :loading="loading"
    :loading-text="'正在加载文档…'"
    :error="error"
    :aria-label="document?.title ?? '文档内容'"
  />
</template>

<script setup lang="ts">
/**
 * 「文档」栏目的**本地静态文档**页。
 *
 * ⚠️ 它和 `document.vue`（后端帖子页）是两回事，别合并：
 * - 本页：`/document` 与 `/document/:id`（**零段或一段**参数），正文是仓库里的
 *   markdown（`tmp/*.md`），不联网；
 * - `document.vue`：`/document/:userid/:postid`（**两段**参数），正文来自后端
 *   `GET /post/{userid}/{postid}`。
 *
 * 两者共用 `/document` 前缀但**段数不同**，vue-router 按段数匹配，不会打架。
 * 本页对「其他页面」零依赖：路由表里已有的条目一条都没改，也没碰任何共享组件。
 */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import DocumentReader from '../components/common/DocumentReader.vue'
import { defaultDocumentId, fetchDocument } from '../api/documents'
import type { DocumentDetail } from '../api/documents'

const route = useRoute()

/**
 * 文档 id：`/document/:id` 取路由参数，`/document` 不带参数时用默认文档。
 *
 * 刻意**不用路由 redirect** 把 `/document` 转到 `/document/xxx`：
 * redirect 得在路由表里 import 默认 id，会让首屏 chunk 多背一份文档注册表。
 */
const documentId = computed(() => {
  const value = route.params.id

  return typeof value === 'string' && value !== '' ? value : defaultDocumentId
})

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

    error.value = cause instanceof Error && cause.message !== '' ? cause.message : '文档加载失败。'
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
