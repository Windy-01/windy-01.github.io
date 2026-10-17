/**
 * 用户资料数据源。
 *
 * `user` 栏目的资料后续会由**后端接口**提供，所以对外只暴露 Promise 化的
 * `fetchUserProfile(id)` —— 组件不关心数据从哪来。接入真实接口时只改本文件的
 * 函数体（请求走通信层 `./http.ts`），调用方一行都不用动。
 *
 * 目前数据来自下面的本地注册表，主页正文（`detail`）是 `tmp/` 下的静态 markdown，
 * 对应 GitHub 用户主页上的 profile README。
 */

import devDetailSource from '../../tmp/user-dev.md?raw'

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
  /** 显示名。 */
  name: string
  /** 登录名（@handle）。 */
  login: string
  /** 头像地址；为空时使用内置占位头像。 */
  avatar: string
}

/**
 * 拉取「当前登录用户」的资料。
 *
 * 契约（**预留给后端，尚未接入**）：`GET /users/me`，带
 * `Authorization: Bearer <token>`，返回 `CurrentUser`；令牌失效时返回 401
 * （通信层会自动清掉本地会话，界面随之回到未登录）。
 *
 * ⚠️ 目前是**留空实现**：恒返回 `null`，所以顶栏只能显示「已登录」这类占位文案。
 * 接入时把函数体换成 `getJson<CurrentUser>('/users/me')` 即可，调用方一行都不用改。
 */
export function fetchCurrentUser(): Promise<CurrentUser | null> {
  return Promise.resolve(null)
}
