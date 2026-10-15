/**
 * 后端接口 base url 的解析与校验。
 *
 * 设置 → 网络里的「API Base URL」是整个后端逻辑的唯一地址来源，但用户手填的值
 * 不一定合法，所以统一在这里规整一次：
 *
 * - **无指定**（留空 / 只有空白）→ 返回空串，调用方按「与站点同源」的默认逻辑走相对路径；
 * - **合法地址**（`http:` / `https:` 绝对地址）→ 返回去掉末尾斜杠的规范形式；
 * - **格式错误**（其它协议、缺协议、纯文本…）→ 同样返回空串，回落到默认逻辑。
 *
 * 注意：这里只判断「能不能用」，**不改写**配置里存的值 ——
 * 用户填错的内容要留在输入框里让他自己改。
 */

/** 允许的协议；其余（`ftp:` / `javascript:` / 无协议…）一律视为格式错误。 */
const allowedProtocols = ['http:', 'https:']

/**
 * 把配置里的 base url 规整成可直接拼接的形式。
 *
 * @param raw 配置里存的原值（可能为空、可能带首尾空白）。
 * @returns 规范化后的前缀（不含末尾斜杠）；无指定或格式错误时返回空串。
 */
export function normalizeApiBaseUrl(raw: string): string {
  const value = raw.trim()

  if (value === '') {
    return ''
  }

  let url: URL

  try {
    url = new URL(value)
  } catch {
    return ''
  }

  if (!allowedProtocols.includes(url.protocol)) {
    return ''
  }

  // 丢掉 query / hash，只保留 origin + path，再去掉末尾斜杠。
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '')
}

/**
 * 配置值是否「填了但格式不对」。
 *
 * 留空**不算**错误（那是「无指定」，走默认逻辑）；只有填了却解析不出合法地址才算。
 * 设置面板用它决定要不要显示提示。
 */
export function isApiBaseUrlInvalid(raw: string): boolean {
  return raw.trim() !== '' && normalizeApiBaseUrl(raw) === ''
}
