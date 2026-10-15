<template>
  <AuthCard
    title="退出登录"
    hint="退出接口已按后端契约接好，服务端尚未就绪。"
    :status="status"
    :status-is-error="hasError"
  >
    <p class="auth-note">
      点击按钮会带着当前的 <code>Authorization: Bearer</code> 令牌请求 <code>GET /logout</code>
      （无参数，只返回状态码）；无论服务端结果如何，本地会话都会被清除，然后回到首页。
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

const status = ref('')
const hasError = ref(false)
const submitting = ref(false)

async function handleSubmit() {
  status.value = ''
  hasError.value = false
  submitting.value = true

  try {
    await logout()
    // 本地会话已由 `logout()` 清除，这里只负责回首页。
    await router.push({ name: 'home' })
  } catch (cause) {
    hasError.value = true
    status.value = cause instanceof Error ? cause.message : '退出登录失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}
</script>
