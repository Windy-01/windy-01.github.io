<template>
  <main class="layout-document-main">
    <div class="layout-document-main__content">
      <slot />
    </div>
  </main>
</template>

<style scoped>
.layout-document-main {
  display: block;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  width: 70%;
  margin-inline: auto;
  padding: 32px 24px;
  overflow: auto;
  justify-content: center;
  border: 1px solid rgb(255 255 255 / 45%);
  border-radius: 20px;
  /*
   * ⚠️ 这里**没有** `backdrop-filter`，是刻意的，别加回来。
   *
   * 卡片是**随页面滚动移动**的，而它背后是 `Background.vue` 里 `position: fixed`
   * 的背景图 + 72% 白色遮罩。两者相对位置每帧都在变，浏览器就无法复用上一次的
   * 模糊结果，只能每帧重新采样那块背景再做高斯模糊 —— 实测（1440×960，同一段
   * 3000px 平滑滚动）：
   *
   *   卡片 blur(14px) → 帧间隔 p95 33.3ms、最差 50~66ms（明显掉帧）
   *   blur 降到 4px   → p95 仍 33.3ms（半径几乎不影响，采样+合成是固定开销）
   *   去掉 blur       → p95 16.7ms、最差 16.8ms（一帧不掉）
   *
   * 顶栏 / 侧栏保留 blur 没问题：它们 fixed 且背后是固定图层，模糊结果可复用。
   *
   * 视觉上几乎无损：背景图先被 `.layout-background__overlay` 的 72% 白色压过一层，
   * 透到卡片上的细节只剩约 28% 的强度，糊不糊肉眼分不出来；卡片的玻璃感由
   * 半透明底 + 高光边框 + 投影一起撑着。
   *
   * 以后若要恢复真毛玻璃，得同时解决「卡片与背景相对静止」——例如让页面不滚、
   * 内容在卡片内部滚（`max-height` + `overflow: auto`），那样 blur 只算一次。
   */
  background-color: rgba(255, 255, 255, 0.269);
  box-shadow: 0 16px 40px rgb(15 23 42 / 12%);
  /*
   * 页面卡片的入场：短、无延迟、起始不完全透明（关键帧见 `globals.css`）。
   *
   * 以前这里是 `0.8s ease-out 0.2s both` —— 卡片是**每个页面各挂一份**的，
   * 换页就会重建，于是每次跳转都要先空 0.2 秒再花 0.8 秒淡入，
   * 整块内容消失一秒，看起来像卡住了。现在压到 0.24 秒且不延迟。
   */
  animation: layout-page-in 0.24s ease-out both;
}

:global(.dark-mode .layout-document-main) {
  border-color: rgb(255 255 255 / 12%);
  background-color: rgb(15 23 42 / 26.9%);
  box-shadow: 0 16px 40px rgb(0 0 0 / 28%);
}

.layout-document-main__content {
  width: min(100%);
  margin: 0 auto;
}

/* 关键帧统一在 `globals.css`（`layout-page-in`），这里只留「减少动效」的兜底。 */
@media (prefers-reduced-motion: reduce) {
  .layout-document-main {
    animation: none;
  }
}

@media (max-width: 768px) {
  .layout-document-main {
    padding: 24px 16px;
  }
}
</style>
