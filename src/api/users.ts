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
