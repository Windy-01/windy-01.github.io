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
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 16px 40px rgb(15 23 42 / 12%);
  animation: layout-fade-in 0.8s ease-out 0.2s both;
}

:global(.dark-mode) .layout-document-main {
  border-color: rgb(255 255 255 / 12%);
  background-color: rgb(15 23 42 / 26.9%);
  box-shadow: 0 16px 40px rgb(0 0 0 / 28%);
}

.layout-document-main__content {
  width: min(100%);
  margin: 0 auto;
}

@keyframes layout-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

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
