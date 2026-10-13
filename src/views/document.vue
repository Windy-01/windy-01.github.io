<template>
  <DocumentMain class="home-document-main">
    <!-- 翻页测试内容：可删除整个区域。 -->
    <div class="page-test" aria-label="翻页测试内容">
      <div v-for="column in testColumns" :key="column" class="page-test__column">
        <span v-for="row in testRows" :key="`${column}-${row}`">1</span>
      </div>
    </div>
  </DocumentMain>
</template>

<script setup lang="ts">
import DocumentMain from '../components/layout/DocumentMain.vue'

const testColumns = 4
const testRows = 32
</script>

<style scoped>
.home-document-main {
  flex: 0 0 auto;
  flex-shrink: 0;
  margin: 0;
}

@media (max-width: 768px) {
  .home-document-main {
    width: 100%;
    margin: 0;
  }
}

:global(.dark-mode) .page-test {
  color: #e2e8f0;
}

.page-test {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
  min-height: 1200px;
  color: #1e293b;
  font-size: 1.25rem;
  line-height: 2;
  text-align: center;
}

.page-test__column {
  display: flex;
  flex-direction: column;
  align-items: center;
}

@media (max-width: 768px) {
  .page-test {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
}
</style>
