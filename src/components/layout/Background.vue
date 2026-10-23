<template>
  <div class="layout-background">
    <div class="layout-background__layer" aria-hidden="true">
      <img
        v-if="imageSrc !== ''"
        :key="attemptKey"
        class="layout-background__image"
        :class="{ 'is-loaded': isBackgroundLoaded }"
        :src="imageSrc"
        alt=""
        decoding="async"
        @load="handleBackgroundLoad"
        @error="handleBackgroundError"
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
import { onUnmounted, ref, watch } from 'vue'

import { isSignedUrl } from '../../api/fileRef'
import { useConfig } from '../../config'

// 背景图地址取自运行时配置：cookie 无有效数据时即默认值。
const { config } = useConfig()

/**
 * 失败后的重试间隔（毫秒），**数组长度就是最大重试次数**。
 *
 * 背景图是纯装饰：失败时用户看到的只是底色，不值得无限重试。默认地址是随机图接口，
 * 偶发 5xx / 超时很常见，三次退避基本都能捞回来；真挂了就安静地用底色。
 */
const retryDelays = [500, 1000, 2000]

const isBackgroundLoaded = ref(false)

/** 真正绑到 `<img>` 上的地址。重试时会带上破缓存的查询参数，所以不直接用配置值。 */
const imageSrc = ref('')

/**
 * `<img>` 的 `key`：每次重试都换一个，强制 Vue 销毁重建这个元素。
 *
 * ⚠️ 不能只改 `src`：签名链接重试时地址是**原样**的（加参数会让签名失效），
 * 给 `ref` 赋同一个字符串不会触发更新，浏览器也就不会重新发请求 —— 重试等于没做。
 * 换 `key` 是唯一能「同一地址再请求一次」的办法。
 */
const attemptKey = ref(0)

/** 已经排队的重试次数（0 = 还没失败过）。 */
const retryCount = ref(0)

let retryTimer: number | undefined

function clearRetryTimer() {
  if (retryTimer !== undefined) {
    window.clearTimeout(retryTimer)
    retryTimer = undefined
  }
}

/**
 * 给重试用的地址加 `retry=n`。
 *
 * 有些 CDN / 中间层会把失败的响应也缓存住，原样再请求拿到的还是同一份失败结果，
 * 换个查询串才绕得开。
 *
 * ⚠️ 两种情况必须原样返回：
 * - **签名链接**（`X-Amz-Signature` 之类）：签名覆盖了整条查询串，多塞一个参数会让
 *   校验直接失败，重试就变成「必然失败」。这类地址只能原样再试。
 * - `data:` / `blob:`：不接受查询参数。
 */
function withRetryParam(url: string, attempt: number): string {
  if (attempt === 0 || url.startsWith('data:') || url.startsWith('blob:') || isSignedUrl(url)) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}retry=${attempt}`
}

/** 地址变了（含首次挂载）就回到初始状态，重试次数从 0 重新算。 */
function resetBackground(url: string) {
  clearRetryTimer()
  retryCount.value = 0
  isBackgroundLoaded.value = false
  imageSrc.value = withRetryParam(url, 0)
  attemptKey.value += 1
}

function handleBackgroundLoad() {
  clearRetryTimer()
  isBackgroundLoaded.value = true
}

/**
 * 加载失败：按 `retryDelays` 依次退避重试，次数用尽就放弃。
 *
 * 放弃后 `<img>` 保持 `opacity: 0`，用户看到的是 `.layout-background__layer` 的纯色底
 * —— 不会出现破图，也不影响任何交互。
 */
function handleBackgroundError() {
  // 已经成功过就不再折腾（配置切换时旧图可能还在，新图失败不该把它换掉）。
  if (isBackgroundLoaded.value || retryCount.value >= retryDelays.length) {
    return
  }

  const delay = retryDelays[retryCount.value]
  retryCount.value += 1
  clearRetryTimer()
  retryTimer = window.setTimeout(() => {
    retryTimer = undefined
    imageSrc.value = withRetryParam(config.backgroundImageUrl, retryCount.value)
    // 地址可能没变（签名链接），靠 key 重建元素才会真的再发一次请求
    attemptKey.value += 1
  }, delay)
}

watch(() => config.backgroundImageUrl, resetBackground, { immediate: true })

onUnmounted(clearRetryTimer)
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
