<template>
  <AuthCard
    title="登录"
    hint="登录接口已按后端契约接好，服务端尚未就绪。"
    :status="status"
    :status-is-error="hasError"
  >
    <form class="auth-form" novalidate @submit.prevent="handleSubmit">
      <label class="auth-field">
        <span class="auth-field__label">用户名或邮箱</span>
        <input
          v-model="account"
          class="auth-field__input"
          type="text"
          name="account"
          autocomplete="username"
          spellcheck="false"
        >
        <p v-if="errors.account" class="auth-field__error">{{ errors.account }}</p>
      </label>

      <label class="auth-field">
        <span class="auth-field__label">密码</span>
        <input
          v-model="password"
          class="auth-field__input"
          type="password"
          name="password"
          autocomplete="current-password"
        >
        <p v-if="errors.password" class="auth-field__error">{{ errors.password }}</p>
      </label>

      <button class="auth-submit" type="submit" :disabled="submitting">
        {{ submitting ? '登录中…' : '登录' }}
      </button>
    </form>

    <template #footer>
      还没有账号？<RouterLink class="auth-link" to="/register">注册</RouterLink>
    </template>
  </AuthCard>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthCard from '../components/common/AuthCard.vue'
import { login } from '../api/auth'

const router = useRouter()

const account = ref('')
const password = ref('')
const errors = reactive({ account: '', password: '' })

const status = ref('')
const hasError = ref(false)
const submitting = ref(false)

/** 本地校验；通过后再交给接口。 */
function validate(): boolean {
  errors.account = account.value.trim() === '' ? '请输入用户名或邮箱。' : ''
  errors.password = password.value === '' ? '请输入密码。' : ''

  return errors.account === '' && errors.password === ''
}

async function handleSubmit() {
  status.value = ''
  hasError.value = false

  if (!validate()) {
    return
  }

  submitting.value = true

  try {
    // 成功后令牌由会话层保存（`src/api/session.ts`），后续请求自动带 `Authorization: Bearer`。
    await login({ account: account.value.trim(), password: password.value })
    await router.push({ name: 'home' })
  } catch (cause) {
    hasError.value = true
    status.value = cause instanceof Error ? cause.message : '登录失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}
</script>
