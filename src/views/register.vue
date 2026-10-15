<template>
  <AuthCard
    title="注册"
    hint="注册接口已按后端契约接好，服务端尚未就绪。"
    :status="status"
    :status-is-error="hasError"
  >
    <form class="auth-form" novalidate @submit.prevent="handleSubmit">
      <label class="auth-field">
        <span class="auth-field__label">用户名</span>
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
        <span class="auth-field__label">邮箱</span>
        <input
          v-model="email"
          class="auth-field__input"
          type="email"
          name="email"
          autocomplete="email"
          spellcheck="false"
        >
        <p v-if="errors.email" class="auth-field__error">{{ errors.email }}</p>
      </label>

      <label class="auth-field">
        <span class="auth-field__label">密码</span>
        <input
          v-model="password"
          class="auth-field__input"
          type="password"
          name="password"
          autocomplete="new-password"
        >
        <p v-if="errors.password" class="auth-field__error">{{ errors.password }}</p>
      </label>

      <label class="auth-field">
        <span class="auth-field__label">确认密码</span>
        <input
          v-model="confirmPassword"
          class="auth-field__input"
          type="password"
          name="confirmPassword"
          autocomplete="new-password"
        >
        <p v-if="errors.confirmPassword" class="auth-field__error">{{ errors.confirmPassword }}</p>
      </label>

      <button class="auth-submit" type="submit" :disabled="submitting">
        {{ submitting ? '注册中…' : '注册' }}
      </button>
    </form>

    <template #footer>
      已经有账号？<RouterLink class="auth-link" to="/login">登录</RouterLink>
    </template>
  </AuthCard>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthCard from '../components/common/AuthCard.vue'
import { register } from '../api/auth'

const router = useRouter()

/** 与后端一致的密码最短长度。 */
const minPasswordLength = 6

const account = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const errors = reactive({
  account: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const status = ref('')
const hasError = ref(false)
const submitting = ref(false)

/** 本地校验；通过后再交给接口。 */
function validate(): boolean {
  const trimmedAccount = account.value.trim()
  const trimmedEmail = email.value.trim()

  errors.account = trimmedAccount === ''
    ? '请输入用户名。'
    : (trimmedAccount.length > 20 ? '用户名不能超过 20 个字符。' : '')

  errors.email = trimmedEmail === ''
    ? '请输入邮箱。'
    : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) ? '' : '邮箱格式不正确。')

  errors.password = password.value === ''
    ? '请输入密码。'
    : (password.value.length < minPasswordLength ? `密码至少 ${minPasswordLength} 位。` : '')

  errors.confirmPassword = confirmPassword.value === ''
    ? '请再次输入密码。'
    : (confirmPassword.value === password.value ? '' : '两次输入的密码不一致。')

  return Object.values(errors).every((message) => message === '')
}

async function handleSubmit() {
  status.value = ''
  hasError.value = false

  if (!validate()) {
    return
  }

  submitting.value = true

  try {
    await register({
      account: account.value.trim(),
      email: email.value.trim(),
      password: password.value,
    })
    // 后端只返回状态码；成功后跳转（真实场景通常直接登录并回首页）。
    await router.push({ name: 'home' })
  } catch (cause) {
    hasError.value = true
    status.value = cause instanceof Error ? cause.message : '注册失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}
</script>
