/**
 * 极简 cookie 读写工具。
 *
 * 只覆盖项目需要的场景：存取一个字符串（通常是 JSON）。
 * 读失败、值缺失、cookie 被禁用等情况一律返回 null / false，
 * 由调用方回落到默认值，不抛异常。
 */

/**
 * 单个 cookie 值的长度上限（编码后）。
 *
 * 浏览器对「单个 cookie」的容量限制普遍是 4096 字节，这里留出
 * 名字与 path / SameSite 等属性的空间，超出即视为写入失败。
 */
const maxCookieValueLength = 3800

/** 读取指定 cookie；不存在、值为空串或解码失败时返回 null。 */
export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const prefix = `${name}=`

  for (const item of document.cookie.split(';')) {
    const entry = item.trim()

    if (!entry.startsWith(prefix)) {
      continue
    }

    const rawValue = entry.slice(prefix.length)

    if (rawValue === '') {
      return null
    }

    try {
      return decodeURIComponent(rawValue)
    } catch {
      return null
    }
  }

  return null
}

export interface CookieOptions {
  /** 有效期（天）。不传则为会话 cookie（关掉浏览器即失效）。 */
  maxAgeDays?: number
  /** 作用路径，默认整站可用。 */
  path?: string
  sameSite?: 'Lax' | 'Strict' | 'None'
  /** 仅在 HTTPS 下发送。本地开发走 http，默认关闭。 */
  secure?: boolean
}

/**
 * 写入 cookie，成功返回 true。
 *
 * 值会做 URI 编码，避免中文与特殊字符破坏 cookie 格式。
 * 写完后会回读校验：超出容量上限或被浏览器拦截（禁用 cookie）时返回 false。
 */
export function writeCookie(name: string, value: string, options: CookieOptions = {}): boolean {
  if (typeof document === 'undefined') {
    return false
  }

  const encodedValue = encodeURIComponent(value)

  if (encodedValue.length > maxCookieValueLength) {
    return false
  }

  const {
    maxAgeDays,
    path = '/',
    sameSite = 'Lax',
    secure = false,
  } = options

  const parts = [`${name}=${encodedValue}`, `path=${path}`, `SameSite=${sameSite}`]

  if (maxAgeDays !== undefined) {
    parts.push(`max-age=${Math.floor(maxAgeDays * 24 * 60 * 60)}`)
  }

  if (secure) {
    parts.push('Secure')
  }

  document.cookie = parts.join('; ')

  return readCookie(name) === value
}

/** 删除 cookie（写入一条立即过期的同路径 cookie）。 */
export function removeCookie(name: string, path = '/'): void {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${name}=; path=${path}; max-age=0; SameSite=Lax`
}
