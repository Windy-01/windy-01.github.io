/**
 * 会话层 —— 保存登录令牌，并提供通信层需要的 `Authorization` 请求头。
 *
 * 后端确定的鉴权方式是 **`Authorization: Bearer <token>`**：
 * `POST /login` 返回 `{ token, token_type }`，之后所有需要鉴权的请求都带上这个头。
 *
 * 分工：
 * - 本文件只管「令牌存在哪、怎么读出来」，不碰网络；
 * - 通信层 `./http.ts` 在发请求时**自动**调用 `getAuthorizationHeader()` 附上头，
 *   业务模块不需要（也不应该）自己写 `Authorization`；
 * - 业务层 `./auth.ts` 在登录成功时 `setSession()`、退出登录时 `clearSession()`。
 *
 * 令牌存在 `localStorage`（键 `windy-session`），刷新页面后仍然有效。
 * 读取时逐字段校验，缺失 / 类型不对 / JSON 损坏 / 存储被禁用，一律视为「未登录」。
 */

import { computed, ref } from 'vue'

/** `localStorage` 里的键名。 */
const sessionStorageKey = 'windy-session'

/** 后端没给（或给了空串）`token_type` 时使用的默认鉴权方案。 */
export const defaultTokenType = 'Bearer'

/** 一次登录会话。 */
export interface Session {
  /** 访问令牌。 */
  token: string
  /** 鉴权方案，当前固定为 `Bearer`。 */
  tokenType: string
  /**
   * 登录时填写的账号（用户名或邮箱）。
   *
   * ⚠️ **临时字段**：用户资料接口（`GET /users/me`）尚未接入，界面拿不到服务端返回的
   * 显示名 / 头像，只能靠这个本地记录的账号区分「当前登录的是哪个用户」。
   * 接口接好后应以 `fetchCurrentUser()` 的结果为准，这里退化成次要信息。
   *
   * 老会话（没有这个字段）读回时是空串，界面回落到「已登录」占位，不会当成未登录。
   */
  account: string
}

/** 从 `localStorage` 读回会话；任何异常都当作「未登录」。 */
function readStoredSession(): Session | null {
  let raw: string | null

  try {
    raw = window.localStorage.getItem(sessionStorageKey)
  } catch {
    // 隐私模式等场景下访问 localStorage 会直接抛错。
    return null
  }

  if (raw === null || raw.trim() === '') {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }

    const record = parsed as Record<string, unknown>
    const token = typeof record.token === 'string' ? record.token.trim() : ''

    if (token === '') {
      return null
    }

    return {
      token,
      tokenType: normalizeTokenType(record.tokenType),
      // 账号只是「临时展示」用的附加信息：缺失 / 类型不对都回落空串，不影响登录态判断。
      account: typeof record.account === 'string' ? record.account.trim() : '',
    }
  } catch {
    return null
  }
}

/** 规整鉴权方案：非空字符串原样使用，其余回落到 `Bearer`。 */
function normalizeTokenType(value: unknown): string {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim()
  }

  return defaultTokenType
}

/**
 * 当前会话，`null` 表示未登录。
 *
 * 是响应式的：界面要跟随登录状态变化（例如顶栏切换「登录 / 退出登录」）时直接用它。
 */
export const session = ref<Session | null>(readStoredSession())

/**
 * 是否已登录（**响应式**）。
 *
 * 界面需要跟随登录状态变化（顶栏切换用户菜单、退出后回到未登录）时直接用它。
 * 不要自己读 `localStorage` —— 那样不会跟着 `setSession()` / `clearSession()` 更新。
 */
export const loggedIn = computed(() => session.value !== null)

/** 是否已登录（函数形式，等价于 `loggedIn.value`）。 */
export function isLoggedIn(): boolean {
  return loggedIn.value
}

/** 当前访问令牌；未登录时为 `null`。 */
export function getAccessToken(): string | null {
  return session.value === null ? null : session.value.token
}

/**
 * 拼出 `Authorization` 请求头的值，未登录时为 `null`。
 *
 * 通信层 `./http.ts` 会自动调用，业务模块不用手写。
 */
export function getAuthorizationHeader(): string | null {
  const current = session.value

  if (current === null) {
    return null
  }

  return `${current.tokenType} ${current.token}`
}

/**
 * 保存会话。
 *
 * 先更新内存（立即生效），再尝试写入 `localStorage`；写入失败（隐私模式 / 配额满）
 * 不影响本次会话可用，只是刷新后会回到未登录。
 *
 * `tokenType` / `account` 都可省略：`tokenType` 省略时回落 `Bearer`，
 * `account` 省略时按空串存（界面回落到「已登录」占位）。
 */
export function setSession(next: {
  token: string
  tokenType?: string
  account?: string
}): void {
  session.value = {
    token: next.token.trim(),
    tokenType: normalizeTokenType(next.tokenType),
    account: typeof next.account === 'string' ? next.account.trim() : '',
  }

  try {
    window.localStorage.setItem(sessionStorageKey, JSON.stringify(session.value))
  } catch {
    // 写不进去就只在内存里保留，不打断登录流程。
  }
}

/** 清除会话（退出登录、令牌失效时调用）。 */
export function clearSession(): void {
  session.value = null

  try {
    window.localStorage.removeItem(sessionStorageKey)
  } catch {
    // 同上：存储不可用时忽略。
  }
}

/**
 * 跨标签页同步登录状态。
 *
 * `storage` 事件只在**其它**标签页写入 `localStorage` 时触发（当前页收不到自己的写入），
 * 所以不会和 `setSession()` / `clearSession()` 互相覆盖。
 * `event.key === null` 表示整份 `localStorage` 被清空，这种情况也要重新读一遍。
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== sessionStorageKey) {
      return
    }

    session.value = readStoredSession()
  })
}
