/**
 * 用户资料数据源。
 *
 * `user` 栏目的资料后续会由**后端接口**提供，所以对外只暴露 Promise 化的
 * `fetchUserProfile(id)` —— 组件不关心数据从哪来。接入真实接口时只改本文件的
 * 函数体（请求走通信层 `./http.ts`），调用方一行都不用动。
 *
 * 目前数据来自下面的本地注册表，主页正文（`detail`）是 `tmp/` 下的静态 markdown，
 * 对应 GitHub 用户主页上的 profile README。注册表里没有的**已登录用户**
 * 由 `createDefaultProfile()` 给一份空数据的默认主页，不会落到错误页。
 */

import devDetailSource from '../../tmp/user-dev.md?raw'
import { session } from './session'

/** 一个用户的公开资料。 */
export interface UserProfile {
  /** 用户 id，与路由参数 `/user/:id` 一致。 */
  id: string
  /** 显示名。 */
  name: string
  /** 登录名（@handle）。 */
  login: string
  /** 头像地址；为空时使用内置占位头像。 */
  avatar: string
  /** 一句话简介。 */
  bio: string
  /** 关注者数量；默认为 0。 */
  followers: number
  /** 正在关注的数量；默认为 0。 */
  following: number
  /** 所属公司；为空则不展示该行。 */
  company: string
  /** 所在地；为空则不展示该行。 */
  location: string
  /** 个人站点；为空则不展示该行。 */
  website: string
  /** 加入日期（`YYYY-MM-DD`），展示为「Joined …」。 */
  joinedAt: string
  /** 主页正文，Markdown。 */
  detail: string
}

/** 接入后端前的本地用户注册表，key 就是路由里的 id。 */
const localUsers: Record<string, Omit<UserProfile, 'id'>> = {
  dev: {
    name: 'Windy',
    login: 'windy-01',
    // 留空表示使用内置占位头像。
    avatar: '',
    bio: '全栈方向，喜欢把想法做成能跑起来的东西。',
    followers: 0,
    following: 0,
    company: 'Independent',
    location: 'China',
    website: 'https://github.com/Windy-01',
    joinedAt: '2024-03-08',
    detail: devDetailSource,
  },
}

/**
 * 按 id 拉取用户资料。
 *
 * @param id 路由参数里的用户 id。
 * @throws 用户不存在时抛错，由调用方渲染错误态。
 */
export async function fetchUserProfile(id: string): Promise<UserProfile> {
  // 预留：接入后端后改为 `getJson<UserProfile>(`/users/${encodeURIComponent(id)}`)`。
  const profile = localUsers[id]

  if (profile === undefined) {
    throw new Error(`没有找到用户「${id}」。`)
  }

  return { id, ...profile }
}

/**
 * 「当前登录用户」的保留 id。
 *
 * 顶栏的「个人主页」在**已登录时**指向 `/user/${currentUserId}`（未登录时指向本地占位用户），
 * 由 `views/user.vue` 再解析成真实用户（见 `fetchCurrentUser()`）。
 * 未登录时访问这个路由会被路由守卫送去登录页。
 */
export const currentUserId = 'me'

/**
 * 「当前登录用户」的精简资料（顶栏用户区用）。
 *
 * 与 `UserProfile` 分开：这是「我自己」的资料，来自带令牌的接口，
 * 不需要主页正文之类重量级字段。
 */
export interface CurrentUser {
  /** 用户 id，与路由 `/user/:id` 的参数一致。 */
  id: string
  /** 显示名；本地兜底实现下，账号缺失（老会话）时为空串。 */
  name: string
  /** 登录名（@handle）；同样可能是空串。 */
  login: string
  /** 头像地址；为空时使用内置占位头像。 */
  avatar: string
}

/**
 * 把登录账号变成适合展示的名字：邮箱只取 `@` 之前的部分。
 *
 * 与顶栏的截断规则一致 —— 邮箱当名字显示成 `@someone@example.com` 太怪。
 */
function accountDisplayName(account: string): string {
  const at = account.indexOf('@')

  return (at > 0 ? account.slice(0, at) : account).trim()
}

/**
 * 拉取「当前登录用户」的资料。
 *
 * 契约（**预留给后端，尚未接入**）：`GET /users/me`，带
 * `Authorization: Bearer <token>`，返回 `CurrentUser`；令牌失效时返回 401
 * （通信层会自动清掉本地会话，界面随之回到未登录）。
 *
 * ⚠️ 目前是**本地兜底实现**：不联网，直接由会话里记的账号造一份资料，
 * 这样所有已登录用户都有一个能用的默认主页（见 `createDefaultProfile()`）。
 * 账号为空的老会话返回 `name` 空串，界面据此退回「已登录」占位。
 * 接入时把函数体换成 `getJson<CurrentUser>('/users/me')` 即可，调用方一行都不用改。
 */
export function fetchCurrentUser(): Promise<CurrentUser | null> {
  const current = session.value

  // 没有会话就没有「当前用户」可言。
  if (current === null) {
    return Promise.resolve(null)
  }

  const account = current.account.trim()
  const displayName = accountDisplayName(account)

  return Promise.resolve({
    // 用完整账号当 id：邮箱登录时 `a@x.com` 与 `a@y.com` 不会撞在一起。
    id: account !== '' ? account : currentUserId,
    name: displayName,
    login: displayName,
    avatar: '',
  })
}

/**
 * 由「当前登录用户」造一份**默认主页**。
 *
 * 后端还没有用户资料，但所有已登录用户都应该有一个能看的个人主页：
 * 显示名 / 登录名取会话里的账号，其余字段留空、关注数为 0，
 * 主页正文（`detail`）为空串 —— 界面据此把 README 标注成「空」。
 *
 * 这些是**占位数据**，不是编造的内容；接入后端后由真实资料替换。
 */
export function createDefaultProfile(user: CurrentUser): UserProfile {
  const name = user.name.trim()
  const login = user.login.trim()

  return {
    id: user.id,
    name: name !== '' ? name : (login !== '' ? login : '未命名用户'),
    login: login !== '' ? login : 'me',
    avatar: user.avatar,
    bio: '',
    followers: 0,
    following: 0,
    company: '',
    location: '',
    website: '',
    joinedAt: '',
    detail: '',
  }
}
