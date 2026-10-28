/**
 * Agent 后端地址（`ip:port`）的解析与校验。
 *
 * 和全局的 `apiBaseUrl`（见 `./endpoint.ts`）有两点不同，都是为「用户手填 ip:port」让路：
 *
 * 1. **允许不带协议**：填 `127.0.0.1:8000` 时自动补 `http://`。
 *    `new URL('127.0.0.1:8000')` 会抛错（`127.0.0.1:` 不是合法 scheme），
 *    所以不能照抄 `normalizeApiBaseUrl()` 的严格逻辑。
 * 2. **仍然只认 `http:` / `https:`**：补完协议后其它协议一律算格式错误。
 *
 * 保留路径前缀（`127.0.0.1:8000/api` → `http://127.0.0.1:8000/api`），与全局 base 一致。
 * 与 `normalizeApiBaseUrl()` 相同，这里**不改写配置里存的值** —— 用户填错的内容要留在
 * 输入框里让他自己改，规整只在发请求时做。
 */

/** 允许的协议；其余（`ftp:` / `javascript:` / 补完协议仍解析失败…）一律视为格式错误。 */
const allowedProtocols = ['http:', 'https:']

/** 是否已经带了协议（`http://` / `https://` / `ws://`…）。 */
const hasProtocol = /^[a-z][\w+.-]*:\/\//i

/**
 * 把 `ip:port` 规整成可直接拼接的前缀。
 *
 * @param raw 用户填的原值（可能为空、可能带首尾空白、可能没写协议）。
 * @returns 规范化后的前缀（不含末尾斜杠）；无指定或格式错误时返回空串。
 */
export function normalizeAgentBaseUrl(raw: string): string {
  const value = raw.trim()

  if (value === '') {
    return ''
  }

  let url: URL

  try {
    url = new URL(hasProtocol.test(value) ? value : `http://${value}`)
  } catch {
    return ''
  }

  if (!allowedProtocols.includes(url.protocol) || url.hostname === '') {
    return ''
  }

  // 丢掉 query / hash，只保留 origin + path，再去掉末尾斜杠。
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '')
}

/**
 * 配置值是否「填了但格式不对」。
 *
 * 留空**不算**错误（那是「无指定」，回落到全局 API Base URL）；
 * 只有填了却解析不出合法地址才算。设置弹层用它决定要不要标红。
 */
export function isAgentBaseUrlInvalid(raw: string): boolean {
  return raw.trim() !== '' && normalizeAgentBaseUrl(raw) === ''
}
