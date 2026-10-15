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
 * 「只返回状态码」的两个接口成功时 resolve（无返回值），失败统一抛 `ApiError`。
 * 拼地址 / JSON 编解码 / 错误包装都在 `./http.ts`，这里只描述业务契约。
 */

import { postJson, request } from './http'

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
 * @returns 后端返回的令牌。
 * @throws 状态码非 2xx，或请求没能发出去（抛 `ApiError`）。
 */
export function login(payload: LoginPayload): Promise<LoginResult> {
  return postJson<LoginResult>('/login', payload)
}

/**
 * 注册。
 *
 * 后端只返回状态码，成功时 resolve，无返回值。
 *
 * @throws 状态码非 2xx，或请求没能发出去（抛 `ApiError`）。
 */
export function register(payload: RegisterPayload): Promise<void> {
  return postJson<void>('/register', payload)
}

/**
 * 退出登录。`GET`，无参数，后端只返回状态码。
 *
 * @throws 状态码非 2xx，或请求没能发出去（抛 `ApiError`）。
 */
export function logout(): Promise<void> {
  return request<void>('/logout', { method: 'GET' })
}
