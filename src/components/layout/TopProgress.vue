<template>
  <div
    class="top-progress"
    :class="{ 'is-visible': isVisible, 'is-instant': isInstant }"
    role="progressbar"
    aria-label="页面加载进度"
  >
    <div class="top-progress__bar" :style="{ width: `${percent}%` }" />
  </div>
</template>

<script setup lang="ts">
/**
 * 顶栏下方的加载进度条。
 *
 * 数据来自 `utils/progress.ts`，但**不是一忙就亮**：
 *
 * 1. **延迟点亮（`SHOW_DELAY_MS`）** —— 任务开始后先等 150ms，到点还没结束才显示。
 *    页面 chunk 已经在浏览器缓存里、或者接口秒回时，导航/请求通常在十几毫秒内就完了，
 *    延迟窗口一过 `isLoading` 已经回到 false，定时器被取消 —— **进度条从头到尾不出现**。
 *    这就是「已经在本地的页面不需要进度条」的实现方式：不去猜哪些页面已加载，
 *    而是直接看「这次到底等没等」。
 * 2. **只统计重要请求** —— 网络侧只有显式标了 `progress: true` 的请求才会推高计数
 *    （见 `api/http.ts` 的 `RequestOptions.progress`）。点赞、补作者名这类后台同步不算。
 *
 * 进度是**假的**：HTTP 不告诉前端还剩多少，所以一开始冲到 8%，之后每 160ms 朝 90%
 * 逼近且越接近越慢，真正结束时再一口气走到 100% 并淡出。目的是让等待可见，不是精确计量。
 * 也因此不设 `aria-valuenow`：拿不到真实进度就别谎报。
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { isLoading } from '../../utils/progress'

/**
 * 任务开始后先等这么久再点亮。
 *
 * 150ms 是「人开始觉得卡」和「一闪而过很烦」之间的折中：低于这个时长的等待，
 * 用户根本感知不到进度条，亮了反而像闪屏。
 */
const SHOW_DELAY_MS = 150
/** 一旦点亮，至少亮这么久（避免刚亮就消失）。 */
const MIN_VISIBLE_MS = 220
/** 100% 之后停留多久再开始淡出。 */
const SETTLE_MS = 140
/** 淡出时长，与 CSS 里 `opacity` 的 transition 对齐。 */
const FADE_OUT_MS = 260
/** 假进度的天花板：真正的 100% 只由「结束」给出。 */
const TRICKLE_CEILING = 90

const percent = ref(0)
const isVisible = ref(false)
/**
 * 瞬时归位：把宽度从 100% 直接设回 8%，**不播放**缩回去的过渡。
 * 只在「上一轮已经走到 100%，同一口气又来了新任务」时用。
 */
const isInstant = ref(false)

let trickleTimer: number | undefined
let showTimer: number | undefined
let hideTimer: number | undefined
let resetTimer: number | undefined
/** 真正亮起来的时刻，用来算「至少亮多久」。 */
let startedAt = 0

function stopTrickle() {
  window.clearInterval(trickleTimer)
  trickleTimer = undefined
}

function startTrickle() {
  stopTrickle()

  trickleTimer = window.setInterval(() => {
    const remain = TRICKLE_CEILING - percent.value

    if (remain <= 0.5) {
      stopTrickle()

      return
    }

    // 走得越来越慢：剩得多时一步 14%，剩得少时退化成每次 0.4%
    percent.value += Math.max(0.4, remain * 0.14)
  }, 160)
}

/** 从 8% 重新起步，且不播放「100% → 8%」的回退动画。 */
function restartWidth() {
  isInstant.value = true
  percent.value = 8
  void nextTick(() => {
    isInstant.value = false
  })
}

/**
 * 已经在显示中，又来了新任务（切页途中接着拉接口、链式请求）。
 *
 * 不重置宽度（那会看到进度倒退）；只有上一轮已经走到 100% 时才重新起步。
 */
function resume() {
  if (percent.value >= 100) {
    restartWidth()
  }

  startTrickle()
}

/** 延迟窗口结束、确认还在忙 → 真正点亮。 */
function reveal() {
  showTimer = undefined

  // 150ms 里任务已经结束了：这次等待太短，不值得显示
  if (!isLoading.value) {
    return
  }

  if (isVisible.value) {
    resume()

    return
  }

  startedAt = Date.now()
  isVisible.value = true

  if (percent.value >= 100) {
    // 上一轮的归零定时器还没跑（隐藏中又来任务），别让宽度从 100% 缩回去
    restartWidth()
  } else {
    percent.value = 8
  }

  startTrickle()
}

function finish() {
  stopTrickle()
  percent.value = 100

  const elapsed = Date.now() - startedAt
  // 留 SETTLE_MS 让人看清「已经到 100%」，再开始淡出
  const wait = Math.max(0, MIN_VISIBLE_MS - elapsed) + SETTLE_MS

  hideTimer = window.setTimeout(() => {
    isVisible.value = false
    // 淡出走完再把宽度归零，否则会看到一条从 100% 缩回去的动画
    resetTimer = window.setTimeout(() => {
      percent.value = 0
    }, FADE_OUT_MS)
  }, wait)
}

function handleBusy(busy: boolean) {
  if (busy) {
    // 可能正停在「100% 等淡出」的阶段，先撤销收尾，接着亮
    window.clearTimeout(hideTimer)
    window.clearTimeout(resetTimer)

    if (isVisible.value) {
      resume()

      return
    }

    // 还没点亮：起一个延迟定时器，到点再决定要不要显示
    if (showTimer === undefined) {
      showTimer = window.setTimeout(reveal, SHOW_DELAY_MS)
    }

    return
  }

  // 空闲：没点亮就别点亮了 —— 这次等待短到用户感觉不到，弹进度条只会闪一下
  window.clearTimeout(showTimer)
  showTimer = undefined

  if (isVisible.value) {
    finish()
  }
}

watch(isLoading, handleBusy)

// 首次挂载时可能已经「忙」了：初始路由跳转在 app.mount() 之前就开始了
onMounted(() => {
  if (isLoading.value) {
    handleBusy(true)
  }
})

onBeforeUnmount(() => {
  stopTrickle()
  window.clearTimeout(showTimer)
  window.clearTimeout(hideTimer)
  window.clearTimeout(resetTimer)
})
</script>

<style scoped>
/*
 * 位置：紧贴顶栏下沿。
 *
 * 顶栏是 `position: fixed`，总高度就是 `--header-height`（全局 `box-sizing: border-box`，
 * 那条 1px 下边框已经算在里面了，所以不用再 +1）。这里用同一个变量算位置，
 * 改顶栏高度时进度条自动跟着走。
 */
.top-progress {
  --tp-from: #6366f1;
  --tp-to: #22d3ee;
  --tp-glow: rgb(99 102 241 / 45%);

  position: fixed;
  top: var(--header-height);
  right: 0;
  left: 0;
  z-index: 11;
  height: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.26s ease;
}

.top-progress.is-visible {
  opacity: 1;
}

.top-progress__bar {
  height: 100%;
  border-radius: 0 999px 999px 0;
  background-image: linear-gradient(90deg, var(--tp-from), var(--tp-to));
  box-shadow: 0 0 8px var(--tp-glow);
  transition: width 0.24s ease;
}

/* 从 100% 重新起步时不要播放「缩回去」的过渡 */
.top-progress.is-instant .top-progress__bar {
  transition: none;
}

/* 暗色下把渐变提亮一档，否则在深色玻璃上会糊成一条灰线 */
:global(.dark-mode .top-progress) {
  --tp-from: #818cf8;
  --tp-to: #67e8f9;
  --tp-glow: rgb(129 140 248 / 55%);
}

@media (prefers-reduced-motion: reduce) {
  .top-progress,
  .top-progress__bar {
    transition: none;
  }
}
</style>
