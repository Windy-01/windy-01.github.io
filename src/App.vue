<template>
  <DefaultLayout>
    <!--
      页面用 `route.path` 作 key，强制「换页就重建」。

      两个原因：
      1. 入场动画挂在页面卡片上（见 `DocumentMain.vue`），组件不重建就不会播，
         于是「/document/10086/1 → /document/10086/2」这类**同一个组件换参数**的
         跳转没有过渡、而换页面有过渡，观感前后不一致；
      2. 页面里的数据都是按路由参数自己拉的，重建等于把旧状态（滚动位置、
         展开态、未提交的输入）一起清掉，比手动逐个 watch 复位更不容易漏。

      ⚠️ 用 `path` 而不是 `fullPath`：查询串变化（例如以后加 ?page=2）不该重建整页。
    -->
    <RouterView v-slot="{ Component, route }">
      <component :is="Component" :key="route.path" />
    </RouterView>
  </DefaultLayout>
</template>

<script setup lang="ts">
import DefaultLayout from './components/layout/DefaultLayout.vue'
</script>
