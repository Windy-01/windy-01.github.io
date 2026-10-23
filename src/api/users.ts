/**
 * 用户资料数据源。
 *
 * `user` 栏目的资料由**后端接口**提供（`GET userinfo/{userid}/profile`，前缀见 `config.apiBaseUrl`），
 * 所以对外只暴露 Promise 化的 `fetchUserProfile(id)` —— 组件不关心数据从哪来。
 *
 * 路由只认三种形态：`/user/me`（当前登录用户）、`/user/dev`（本地占位）、
 * `/user/<userid>`（按 userid 取后端资料）。**不支持用账号名访问。**
 */

import devDetailSource from '../../tmp/user-dev.md?raw'
import { ApiError } from './http'
import { decodeTokenSubject, session } from './session'
import { avatarUrlOf, fetchRemoteProfile, fetchRemoteReadme } from './userinfo'

/**
 * 一个用户的公开资料。
 *
 * 字段分两类（编辑态据此决定哪些能改）：
 * - **可改**：`name`（用户名，走独立接口）、`bio`、`website`、`age`、`birthday`、`phone`；
 * - **只读**：`id`（userid）、`email`、`login`（@handle）、`followers`、`following`、`joinedAt`；
 * - `avatar` / `detail` 是独立资源（各自有上传接口），不随资料体提交。
 */
export interface UserProfile {
  /** 用户 id（userid，令牌里的 `sub`），与路由参数 `/user/:id` 一致。只读。 */
  id: string
  /** 用户名。可改，但走**独立接口**（`update/username`），不随资料体提交。 */
  name: string
  /** 登录名（@handle），只读。 */
  login: string
  /** 头像地址；为空时使用内置占位头像。 */
  avatar: string
  /** 一句话简介。 */
  bio: string
  /** 邮箱。只读，编辑态不出现，也不随资料体提交。 */
  email: string
  /** 个人站点；为空则不展示该行。 */
  website: string
  /** 年龄；0 表示没填（不展示该行）。 */
  age: number
  /** 生日（`YYYY-MM-DD`）；为空则不展示该行。 */
  birthday: string
  /** 电话。 */
  phone: string
  /** 关注者数量；只读，默认 0。 */
  followers: number
  /** 正在关注的数量；只读，默认 0。 */
  following: number
  /** 加入日期（`YYYY-MM-DD`），只读。 */
  joinedAt: string
  /** 主页正文，Markdown（独立资源）。 */
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
    email: 'windy@example.com',
    website: 'https://github.com/Windy-01',
    age: 22,
    birthday: '2004-03-08',
    phone: '13800000000',
    followers: 0,
    following: 0,
    joinedAt: '2024-03-08',
    detail: devDetailSource,
  },
}

/**
 * 按 id 拉取用户资料。
 *
 * 路由只认三种形态（**不再支持用账号名访问**）：
 * - `/user/me` —— 当前登录用户，由 `views/user.vue` 先解析成 userid 再调这里；
 * - `/user/dev` —— 本地占位用户，直接读 `localUsers`，不联网；
 * - `/user/<userid>` —— 只按 **userid** 请求后端。
 *
 * ⚠️ 除 `dev` 外**不再回落到本地注册表 / 账号**：以前「后端失败就按 id 查注册表」
 * 会让任意账号名都能打开一页资料，等于变相支持了 username 访问。现在拿不到就抛错，
 * 由调用方渲染错误态（`/user/me` 在 `user.vue` 里有「默认主页」兜底，不受影响）。
 *
 * @param id 路由参数：`dev` 或 userid（`me` 会先被解析掉）。
 * @throws 后端取不到这个 userid 的资料时抛错。
 */
export async function fetchUserProfile(id: string): Promise<UserProfile> {
  const dev = localUsers[devUserId]

  if (id === devUserId && dev !== undefined) {
    return { id, ...dev }
  }

  let remote: UserProfile

  try {
    remote = await fetchRemoteProfile(id)
  } catch (cause) {
    // 404 = 这个 userid 没有资料。**不再按账号名回落**，所以直接告诉用户
    // 「本页只认 me / dev / userid」比抛一句「请求失败（404）」清楚得多。
    if (cause instanceof ApiError && cause.status === 404) {
      throw new Error(`没有找到 ID 为「${id}」的用户（本页只支持 /user/me、/user/dev 与 userid）。`)
    }

    throw cause
  }

  // 后端资料里没带头像地址时，按约定的头像接口补一个：
  // 头像和资料是两个接口，资料体里往往只存「有没有头像」而不存 URL。
  if (remote.avatar.trim() === '') {
    remote.avatar = avatarUrlOf(remote.id)
  }

  // README 也是独立资源，资料体里不带它。接口 404 表示「还没写过 README」，
  // 保持空串即可 —— 不能因为这一项失败就把整份资料丢掉。
  try {
    remote.detail = await fetchRemoteReadme(remote.id)
  } catch {
    // 保留资料里可能带回来的 detail（通常是空串）。
  }

  return remote
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
 * 本地占位用户的保留 id（`/user/dev`）。
 *
 * 未登录时顶栏的「个人主页」指向它，资料来自 `localUsers`，不联网。
 */
export const devUserId = 'dev'

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
 * ⚠️ 目前是**本地兜底实现**：不联网，从会话里造一份资料，
 * 这样所有已登录用户都有一个能用的默认主页（见 `createDefaultProfile()`）。
 *
 * **`id` 取令牌里的 `sub`**（`decodeTokenSubject()`）—— 后端所有 `userinfo/{userid}/...`
 * 接口认的都是它，不是登录账号。令牌不是 JWT / 没有 `sub` 时才回落到账号，
 * 账号也没有（老会话）才用保留 id `me`。显示名仍然来自账号。
 *
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
  // 令牌里的 subject 才是后端认的 userid。
  const subject = decodeTokenSubject(current.token)

  return Promise.resolve({
    id: subject !== '' ? subject : (account !== '' ? account : currentUserId),
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
 * ⚠️ **头像地址仍然要拼**：资料接口 404 不代表没有头像，头像本来就走独立接口。
 * 这里直接给 `avatarUrlOf(id)`，页面加载时会去取；取不到（404 / 地址失效）
 * `<img>` 自己回落到占位图，不需要前端再判断。
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
    avatar: user.avatar.trim() !== '' ? user.avatar : avatarUrlOf(user.id),
    bio: '',
    email: '',
    website: '',
    age: 0,
    birthday: '',
    phone: '',
    followers: 0,
    following: 0,
    joinedAt: '',
    detail: '',
  }
}
