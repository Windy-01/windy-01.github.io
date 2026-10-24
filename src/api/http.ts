/**
 * 外部接口通信层 —— 站内**唯一的网络出口**。
 *
 * 所有自有后端请求都必须经过这里，好处是四件事只在一处做：
 * 1. 拼地址：统一以设置 → 网络里的「API Base URL」（`config.apiBaseUrl`）为前缀，
 *    由 `normalizeApiBaseUrl()` 规整；**留空或格式错误都回落到「与站点同源」的相对路径**；
 * 2. 鉴权：已登录时自动带上 `Authorization: Bearer <token>`（见 `./session.ts`）；
 * 3. 编解码：请求体自动 JSON 序列化（`FormData` 例外，见 `postForm()`），响应体自动按 JSON 解析；
 * 4. 错误：非 2xx 与「请求根本没发出去」都统一转成 `ApiError`。
 *
 * 业务模块（如 `./auth.ts`）只描述「请求哪个路径、带什么参数、返回什么类型」，
 * 不要自己调 `fetch`，也不要自己拼 base url、自己写 `Authorization`。
 */

import { normalizeApiBaseUrl, useConfig } from '../config'
import { clearIdentity } from './identity'
import { clearSession, getAuthorizationHeader } from './session'

/**
 * 接口调用失败时抛出的错误。
 *
 * 调用方可以直接读 `status` 区分情况，`message` 是一句可直接展示给用户的文案。
 */
export class ApiError extends Error {
  /** HTTP 状态码；`0` 表示请求根本没发出去（断网 / 服务未启动 / 跨域被拦）。 */
  readonly status: number
  /** 服务端返回的原始响应体；能解析成 JSON 时是对象，否则是文本或 `null`。 */
  readonly body: unknown

  constructor(status: number, message: string, body: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/** 查询参数；值为 `undefined` / `null` 的键会被跳过。 */
export type QueryParams = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /**
   * 请求体。两种形态：
   * - 普通对象 / 数组 → JSON 序列化，并带 `Content-Type: application/json`；
   * - `FormData` → **原样发送**，且**不设置** `Content-Type` —— multipart 的
   *   `boundary` 必须由浏览器自己生成，手写会漏掉它导致后端解析失败。
   */
  body?: unknown
  /**
   * 纯文本请求体（`text/plain;charset=UTF-8`），与 `body` 互斥且优先。
   *
   * 只给「后端用 `@RequestBody String` 接」的接口用（例如 `update/username`）：
   * 那种签名会把 body **原样**当值存下去，发 JSON 会把整段 `{"name":"x"}` 存进数据库。
   */
  textBody?: string
  query?: QueryParams
  /** 用于取消请求；被取消时原样抛出 `AbortError`，不包装成 `ApiError`。 */
  signal?: AbortSignal
  /**
   * 是否附带登录令牌。
   *
   * 默认 `true`：只要本地有会话就自动加上 `Authorization: Bearer <token>`；
   * 公开接口（登录 / 注册等）显式传 `false`，避免带上过期的旧令牌。
   */
  auth?: boolean
}

/** 拼出最终请求地址：base url 无指定或格式错误时，回落到同源相对路径。 */
function resolveUrl(path: string, query?: QueryParams): string {
  const { config } = useConfig()
  // `normalizeApiBaseUrl()` 对「留空 / 格式错误」统一返回空串，即与站点同源。
  const base = normalizeApiBaseUrl(config.apiBaseUrl)
  const suffix = path.startsWith('/') ? path : `/${path}`

  let url = `${base}${suffix}`

  if (query !== undefined) {
    const search = new URLSearchParams()

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        search.append(key, String(value))
      }
    }

    const queryString = search.toString()

    if (queryString !== '') {
      url += `${url.includes('?') ? '&' : '?'}${queryString}`
    }
  }

  return url
}

/** 从响应体里尽量抽出一句可读的错误信息；抽不到就返回空串。 */
function extractMessage(body: unknown): string {
  if (typeof body === 'string') {
    const text = body.trim()

    // 过长的文本、HTML 错误页都不适合直接展示给用户。
    if (text === '' || text.length > 200 || text.startsWith('<')) {
      return ''
    }

    return text
  }

  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>
    const detail = record.message ?? record.detail ?? record.error

    if (typeof detail === 'string' && detail.trim() !== '') {
      return detail.trim()
    }
  }

  return ''
}

/** 拼一句可展示的错误文案：优先用响应体里的信息，其次状态文本，最后兜底。 */
function readErrorMessage(status: number, statusText: string, body: unknown): string {
  const fromBody = extractMessage(body)

  if (fromBody !== '') {
    return fromBody
  }

  // 注意：HTTP/2 下 `statusText` 通常为空串，这时走兜底文案。
  return statusText.trim() !== '' ? statusText.trim() : `请求失败（HTTP ${status}）。`
}

/** 读响应体：204 或空响应返回 `undefined`，其余尽量按 JSON 解析。 */
async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined
  }

  const text = await response.text()

  if (text.trim() === '') {
    return undefined
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

/**
 * 发起一次请求并返回解析后的响应体。
 *
 * - `2xx`：返回响应体；后端只返回状态码（空响应 / 204）时为 `undefined`。
 * - 其它状态码：抛 `ApiError`，`status` 是 HTTP 状态码。
 * - 请求没能发出（断网 / 服务未启动）：抛 `ApiError`，`status` 为 `0`。
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, textBody, query, signal, auth = true } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  let payload: BodyInit | undefined

  if (auth) {
    const authorization = getAuthorizationHeader()

    if (authorization !== null) {
      headers.Authorization = authorization
    }
  }

  if (textBody !== undefined) {
    // 纯文本：`@RequestBody String` 的后端拿到的就是这段字面量。
    headers['Content-Type'] = 'text/plain;charset=UTF-8'
    payload = textBody
  } else if (typeof FormData !== 'undefined' && body instanceof FormData) {
    // multipart：**不要**手动设 Content-Type，浏览器会自动补上带 boundary 的那一份。
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response: Response

  try {
    response = await fetch(resolveUrl(path, query), { method, headers, body: payload, signal })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }

    throw new ApiError(0, '无法连接到服务器，请检查网络或 API 地址。', null)
  }

  const responseBody = await readBody(response)

  if (!response.ok) {
    // 令牌失效：带鉴权的请求仍收到 401，说明本地令牌已经不可用（过期 / 被吊销），
    // 直接清掉会话与身份缓存，界面随之回到未登录，避免顶栏一直显示「已登录」却什么也做不了。
    // 登录 / 注册是 `auth: false`，它们返回 401（账号密码错误）时不会走到这里。
    if (response.status === 401 && auth) {
      clearSession()
      clearIdentity()
    }

    throw new ApiError(
      response.status,
      readErrorMessage(response.status, response.statusText, responseBody),
      responseBody,
    )
  }

  return responseBody as T
}

/** GET 请求，返回 JSON。 */
export function getJson<T>(
  path: string,
  options: Omit<RequestOptions, 'method' | 'body'> = {},
): Promise<T> {
  return request<T>(path, { ...options, method: 'GET' })
}

/** POST 请求，`body` 会被 JSON 序列化。 */
export function postJson<T>(
  path: string,
  body?: unknown,
  options: Omit<RequestOptions, 'method' | 'body' | 'textBody'> = {},
): Promise<T> {
  return request<T>(path, { ...options, method: 'POST', body })
}

/**
 * POST 纯文本（`text/plain;charset=UTF-8`）。
 *
 * 给「后端 `@RequestBody String`」那类接口用 —— 它把 body 原样当值，
 * 用 `postJson` 会把 `{"name":"x"}` 整段存进去。
 */
export function postText<T>(
  path: string,
  text: string,
  options: Omit<RequestOptions, 'method' | 'body' | 'textBody'> = {},
): Promise<T> {
  return request<T>(path, { ...options, method: 'POST', textBody: text })
}

/**
 * POST 请求，以 `multipart/form-data` 发送。
 *
 * 文件上传统一走这里：调用方自己组好 `FormData`（字段名要跟后端参数名一致），
 * 不要手动设置 `Content-Type`。
 */
export function postForm<T>(
  path: string,
  form: FormData,
  options: Omit<RequestOptions, 'method' | 'body'> = {},
): Promise<T> {
  return request<T>(path, { ...options, method: 'POST', body: form })
}
