/**
 * 顶部加载进度条的共享状态。
 *
 * 进度条（`components/layout/TopProgress.vue`）由**两路**信号推动：
 * 1. 路由跳转 —— `router/index.ts` 的 `beforeEach` / `afterEach`。
 *    它覆盖了「异步页面 chunk 还没下载完」的那段时间，而这正是切页时最长的等待；
 * 2. 网络请求 —— `api/http.ts` 的 `request()`，但**只有显式标了 `progress: true` 的
 *    请求**才计数（页面主体内容 / 写操作；点赞、补作者名不算）。用**计数**而不是布尔量，
 *    因为并发请求很常见（打开主页会同时拉 id / profile / avatar）。
 *
 * ⚠️ 这里的 `isLoading` 只表示「有事在忙」，**不等于「进度条要显示」**：
 * 组件那边还有一道 150ms 延迟 —— 瞬间完成的跳转（chunk 已在本地）或秒回的接口
 * 在延迟窗口内就结束了，进度条根本不会出现。要改「什么时候该显示」看组件，
 * 要改「哪些请求算数」看 `RequestOptions.progress`。
 *
 * 为什么单独抽一个模块：`http.ts` 是站内唯一的网络出口，它必须能上报「有请求在飞」，
 * 但不该去 import 任何组件。反过来组件只读这里的 `isLoading`，两边都不认识对方。
 *
 * ⚠️ 这里只有计数，没有「进度百分比」。真实进度无从得知（HTTP 不告诉前端还剩多少），
 * 百分比由进度条组件自己用一个「越接近终点越慢」的假进度推算。
 */

import { computed, ref } from 'vue'

/** 还没结束的请求数。 */
const inFlight = ref(0)
/** 是否正在做路由跳转（含页面 chunk 下载）。 */
const navigating = ref(false)

/** 当前在飞的请求数，给诊断 / 断言用。 */
export const pendingRequests = computed(() => inFlight.value)

/** 是否正在跳转。 */
export const isNavigating = computed(() => navigating.value)

/** 只要有请求在飞、或正在跳转，进度条就该显示。 */
export const isLoading = computed(() => inFlight.value > 0 || navigating.value)

/** 请求发出前调用。 */
export function beginRequest(): void {
  inFlight.value += 1
}

/**
 * 请求收尾时调用。
 *
 * ⚠️ 必须放在 `finally` 里：请求失败、被 `AbortSignal` 取消都要减回去，
 * 否则计数只增不减，进度条会一直挂在顶上。
 * 这里的 `Math.max(0, …)` 是防御性的 —— 理论上不会减到负数。
 */
export function endRequest(): void {
  inFlight.value = Math.max(0, inFlight.value - 1)
}

/** 路由钩子里调用：`true` 开始跳转，`false` 跳转结束（含失败 / 被取消）。 */
export function setNavigating(value: boolean): void {
  navigating.value = value
}
