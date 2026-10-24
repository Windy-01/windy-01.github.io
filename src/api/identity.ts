/**
 * 身份 cookie（`windy-identity`）—— 缓存 `username` / `account` / `userid`。
 *
 * 为什么要缓存：
 * - **`username` 只有一个独立接口**（`GET /userinfo/{userid}/username`），顶栏每页都要显示，
 *   每次都打一次请求不划算；
 * - **`account` 后端没有读接口**（在 `useroauth` 表里，只有 `GET /{account}/id` 这个反查），
 *   只能记登录时填的那个值；
 * - **`userid`** 就是令牌的 `sub`，但 `sub` 只有解 JWT 才拿得到，缓存一份省事。
 *
 * ⚠️ **这是缓存，不是权威**：`userid` 与令牌 `sub` 不一致时以令牌为准
 * （见 `currentUserid()`）；退出登录 / 401 自动清会话时一并清掉。
 *
 * ⚠️ **不复用 `windy-settings`**：那是「站点设置」，`resetConfig()` 会整份重置；
 * 身份数据混进去会在「恢复默认设置」时被误清，也会把设置 cookie 撑大。
 */

import { ref } from 'vue'

import { session, getSessionSubject } from './session'
import { readCookie, removeCookie, writeCookie } from '../utils/cookie'

/** cookie 名。 */
const identityCookieName = 'windy-identity'

/** 有效期（天）：与设置 cookie 一致，一年。 */
const identityMaxAgeDays = 365

/** 缓存下来的身份字段。 */
export interface Identity {
  /** 用户名（`userdetails.username`，可改）。 */
  username: string
  /** 登录账号（`useroauth.account`，不可改；登录时填的那个值）。 */
  account: string
  /** 主键（`userdetails.userid`，等于令牌的 `sub`）。 */
  userid: string
}

/** 空身份。字段缺失时用它兜底，避免到处判 `null`。 */
const emptyIdentity: Identity = { username: '', account: '', userid: '' }

/** 从任意值里取字符串，缺失 / 类型不对一律空串。 */
function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 从 cookie 读回身份；缺失 / JSON 损坏 / 字段不对都返回 `null`。 */
function readStoredIdentity(): Identity | null {
  const raw = readCookie(identityCookieName)

  if (raw === null || raw.trim() === '') {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null
    }

    const record = parsed as Record<string, unknown>
    const identityValue: Identity = {
      username: asText(record.username),
      account: asText(record.account),
      userid: asText(record.userid),
    }

    // 三样全空等于没存：别让一条垃圾 cookie 一直存在。
    if (identityValue.username === '' && identityValue.account === '' && identityValue.userid === '') {
      return null
    }

    return identityValue
  } catch {
    return null
  }
}

/**
 * 当前缓存的身份（响应式）。
 *
 * `null` 表示还没写过（未登录 / 老会话）。读取请用下面三个 `currentXxx()`，
 * 它们会各自回落到令牌或会话里的账号。
 */
export const identity = ref<Identity | null>(readStoredIdentity())

/** 两份身份是否完全一致。 */
function sameIdentity(a: Identity, b: Identity): boolean {
  return a.username === b.username && a.account === b.account && a.userid === b.userid
}

/**
 * 写入身份（**增量合并**）。
 *
 * 只传要更新的字段即可：登录成功写三样，改完用户名只更新 `username`。
 * 返回是否写进 cookie —— 失败（禁用 cookie / 超容量）时内存仍会更新，本次会话可用。
 *
 * ⚠️ **内容没变时直接返回，不替换 `identity`**：它是 ref，换成一个等值的新对象会让
 * `watch(identity)` 白触发一轮（顶栏会再拉一次 username），严重时形成
 * 「GET username → 写 cookie → watch → 再 GET」的死循环。
 */
export function saveIdentity(patch: Partial<Identity>): boolean {
  const current = identity.value ?? emptyIdentity
  const next: Identity = {
    username: patch.username ?? current.username,
    account: patch.account ?? current.account,
    userid: patch.userid ?? current.userid,
  }

  // 缺的字段用令牌 / 会话补齐：改用户名时只传 `username`，不补齐会写出一条
  // `{ username }` 的残缺 cookie（下次读回来 `account` / `userid` 全空）。
  if (next.account === '') {
    next.account = session.value?.account ?? ''
  }

  if (next.userid === '') {
    next.userid = getSessionSubject()
  }

  // 三项全空没有意义，别留一条垃圾 cookie。
  if (next.username === '' && next.account === '' && next.userid === '') {
    return false
  }

  if (identity.value !== null && sameIdentity(identity.value, next)) {
    return true
  }

  identity.value = next

  return writeCookie(identityCookieName, JSON.stringify(next), {
    maxAgeDays: identityMaxAgeDays,
  })
}

/** 清除身份缓存（退出登录、令牌失效时调用）。 */
export function clearIdentity(): void {
  identity.value = null
  removeCookie(identityCookieName)
}

/**
 * 当前用户的 userid。
 *
 * 优先级：cookie 里缓存的 `userid` → 令牌的 `sub`。
 * ⚠️ 令牌是**权威**：两者不一致时说明换过账号（老 cookie），以 `sub` 为准。
 */
export function currentUserid(): string {
  const subject = getSessionSubject()

  if (subject !== '') {
    return subject
  }

  return identity.value?.userid ?? ''
}

/**
 * 当前用户的登录账号。
 *
 * 优先级：cookie 里缓存的 `account` → 登录时填的值（`session.account`）。
 * ⚠️ 后端没有「按 userid 查 account」的接口，所以**只能**用这两个来源之一；
 * 用邮箱登录时 `session.account` 会是邮箱，此时它同样能命中 `GET /{account}/id`。
 */
export function currentAccount(): string {
  const cached = identity.value?.account ?? ''

  if (cached !== '') {
    return cached
  }

  return session.value?.account ?? ''
}

/** 当前用户的用户名（`userdetails.username`）；没有缓存时为空串。 */
export function currentUsername(): string {
  return identity.value?.username ?? ''
}
