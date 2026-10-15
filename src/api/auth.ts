/**
 * 认证接口。
 *
 * 后端契约（地址由 `config.apiBaseUrl` 提供，留空 = 与站点同源）：
 *
 * | 方法   | 路径        | 请求体                          | 响应                    |
 * | ------ | ----------- | ------------------------------- | ----------------------- |
 * | `POST` | `/login`    | `{ account, password }`         | `{ token, token_type }` |
 * | `POST` | `/register` | `{ account, email, password }`  | 只返回状态码            |
 * | `GET`  | `/logout`   | 无参数                          | 只返回状态码            |
 *
 * 鉴权方式为 **`Authorization: Bearer <token>`**：登录成功后令牌交给会话层
 * `./session.ts` 保存，之后由通信层 `./http.ts` 自动附到请求头上；退出登录时清掉。
 * 登录 / 注册是公开接口，显式不带令牌（`auth: false`）。
 *
 * 「只返回状态码」的两个接口成功时 resolve（无返回值），失败统一抛 `ApiError`。
 * 拼地址 / JSON 编解码 / 错误包装都在 `./http.ts`，这里只描述业务契约。
 */

import { postJson, request } from './http'
import { clearSession, setSession } from './session'

/** 登录参数。 */
export interface LoginPayload {
  /** 账号：用户名或邮箱。 */
  account: string
  password: string
}

/** 注册参数。 */
export interface RegisterPayload {
  /** 账号：用户名。 */
  account: string
  email: string
  password: string
}

/** 登录成功后返回的令牌。 */
export interface LoginResult {
  /** 访问令牌。 */
  token: string
  /** 令牌类型，后端当前固定返回 `Bearer`。 */
  token_type: string
}

/**
 * 登录。
 *
 * 成功后令牌交给会话层保存（`localStorage` + 响应式 `session`），
 * 之后通信层会自动在请求头带上 `Authorization: Bearer <token>`。
 *
 * @returns 后端返回的令牌。
 * @throws 状态码非 2xx、请求没能发出去，或响应里没有可用的 `token`。
 */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  const result = await postJson<LoginResult>('/login', payload, { auth: false })
  const token = typeof result?.token === 'string' ? result.token.trim() : ''

  if (token === '') {
    throw new Error('登录响应里没有可用的 token，无法保存登录状态。')
  }

  setSession({ token, tokenType: result.token_type })

  return result
}

/**
 * 注册。
 *
 * 后端只返回状态码，成功时 resolve，无返回值。**不会**自动登录，
 * 需要用户再走一次登录流程拿令牌。
 *
 * @throws 状态码非 2xx，或请求没能发出去（抛 `ApiError`）。
 */
export function register(payload: RegisterPayload): Promise<void> {
  return postJson<void>('/register', payload, { auth: false })
}

/**
 * 退出登录。`GET`，无参数，后端只返回状态码。
 *
 * 请求会带上当前令牌；**无论后端成功与否，本地会话都会被清除** ——
 * 用户点「退出登录」的意图是明确的，不该因为网络问题而停留在登录态。
 *
 * @throws 状态码非 2xx，或请求没能发出去（抛 `ApiError`）；本地会话此时已清除。
 */
export async function logout(): Promise<void> {
  try {
    await request<void>('/logout', { method: 'GET' })
  } finally {
    clearSession()
  }
}
