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
  background-color: rgba(255, 255, 255, 0.269);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
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

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  .layout-document-main {
    background-color: rgb(255 255 255 / 72%);
  }
}

:global(.dark-mode .layout-document-main) {
  border-color: rgb(255 255 255 / 12%);
  background-color: rgb(15 23 42 / 26.9%);
  box-shadow: 0 16px 40px rgb(0 0 0 / 28%);
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  :global(.dark-mode .layout-document-main) {
    background-color: rgb(15 23 42 / 88%);
  }
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
