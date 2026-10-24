<template>
  <AuthCard
    title="退出登录"
    hint="退出后会同时清除本地令牌与身份缓存（用户名 / 账号 / userid）。"
  >
    <p class="auth-note">
      点击按钮会带着当前的 <code>Authorization: Bearer</code> 令牌请求 <code>GET /logout</code>
      （无参数，只返回状态码）。这里<strong>只尝试通知后端、不校验结果</strong>：无论服务端
      返回成功还是失败，本地会话都会被清除，然后回到首页。
    </p>

    <form class="auth-form" novalidate @submit.prevent="handleSubmit">
      <button class="auth-submit" type="submit" :disabled="submitting">
        {{ submitting ? '退出中…' : '退出登录' }}
      </button>
    </form>

    <template #footer>
      暂时不想退出？<RouterLink class="auth-link" to="/">返回首页</RouterLink>
    </template>
  </AuthCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthCard from '../components/common/AuthCard.vue'
import { logout } from '../api/auth'

const router = useRouter()

const submitting = ref(false)

async function handleSubmit() {
  submitting.value = true

  try {
    // 只尝试通知后端，不校验结果；本地会话在 `logout()` 里无条件清除。
    await logout()
    await router.push({ name: 'home' })
  } catch {
    // 退出本身不会失败（后端结果已被 `logout()` 吞掉），这里只兜底导航异常。
  } finally {
    submitting.value = false
  }
}
</script>
