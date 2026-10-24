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
 * 「只返回状态码」的两个接口：`POST /register` 失败会抛 `ApiError`；
 * `GET /logout` **只尝试通知后端、不校验结果**，永不抛错。
 * 拼地址 / JSON 编解码 / 错误包装都在 `./http.ts`，这里只描述业务契约。
 */

import { postJson, request } from './http'
import { clearIdentity, saveIdentity } from './identity'
import { clearSession, decodeTokenSubject, setSession } from './session'
import { fetchRemoteUsername } from './userinfo'

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

  // 先存会话：下面取用户名要带令牌，通信层是从会话里拿的。
  setSession({ token, tokenType: result.token_type, account: payload.account })

  // 身份 cookie：`userid` 从令牌的 `sub` 解，`account` 就是这次填的账号，
  // `username` 只有独立接口能给 —— 多问一次，失败就留空（顶栏回落到账号）。
  const userid = decodeTokenSubject(token)
  let username = ''

  if (userid !== '') {
    try {
      username = await fetchRemoteUsername(userid)
    } catch {
      // 非致命：顶栏还有账号可显示，下次打开主页会再试。
    }
  }

  saveIdentity({ username, account: payload.account.trim(), userid })

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
 * **只尝试通知后端，不校验结果**：请求会带上当前令牌，但无论后端返回 2xx 还是 4xx，
 * 甚至压根没连上，本地会话都会被清除，函数本身**不会抛错**。
 *
 * 理由：用户点「退出登录」的意图很明确，本地必须先退出；服务端是否成功吊销令牌
 * 不该阻塞这件事（最坏情况只是令牌在服务端多存活一会儿）。
 */
export async function logout(): Promise<void> {
  try {
    await request<void>('/logout', { method: 'GET' })
  } catch {
    // 故意吞掉：结果不参与判断，见上方说明。
  } finally {
    clearSession()
    // 身份 cookie 也一起清：留着会让顶栏显示上一个账号的名字。
    clearIdentity()
  }
}
