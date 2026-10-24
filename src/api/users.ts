/**
 * 用户资料数据源。
 *
 * 路由只认两种形态：
 *
 * | 路由                | 数据来源                                          |
 * | ----------------- | --------------------------------------------- |
 * | `/user`           | **作者展示页**：读本地静态资料（`authorProfile`），不联网 |
 * | `/user/{account}` | 按**登录账号**打开某个用户的主页                            |
 *
 * ⚠️ **一个 account 要打三次请求**：先 `GET userinfo/{account}/id` 换成 userid
 * （后端认的是 userid，不是账号），再拿 userid 取 `profile` 与 `username`；
 * 头像与 README 还各是一个独立资源。
 *
 * ⚠️ **主页 URL 用 account 而不是 userid / username**：account 是登录账号，
 * 不可改、唯一；username 是显示名，可改 —— 改完名字 URL 不该跟着变。
 */

import devDetailSource from '../../tmp/user-dev.md?raw'
import { ApiError } from './http'
import { currentAccount, currentUserid, currentUsername, saveIdentity } from './identity'
import { session } from './session'
import {
  avatarUrlOf,
  fetchRemoteProfile,
  fetchRemoteReadme,
  fetchRemoteUserid,
  fetchRemoteUsername,
} from './userinfo'

/**
 * 一个用户的公开资料。
 *
 * 字段分三类（编辑态据此决定哪些能改）：
 * - **可改**：`name`（用户名，走独立接口）、`bio`、`website`、`age`、`birthday`、`phone`；
 * - **只读**：`id`（userid）、`email`、`login`（登录账号）、`followers`、`following`、`joinedAt`；
 * - `avatar` / `detail` 是独立资源（各自有上传接口），不随资料体提交。
 */
export interface UserProfile {
  /** 用户 id（userid，令牌里的 `sub`）。只读，由 `GET userinfo/{account}/id` 换来。 */
  id: string
  /** 用户名（`userdetails.username`）。可改，但走**独立接口**（`update/username`）。 */
  name: string
  /** 登录账号（`useroauth.account`）。只读，就是主页 URL 里那一段。 */
  login: string
  /** 头像地址；为空时使用内置占位头像。 */
  avatar: string
  /** 一句话简介。 */
  bio: string
  /** 邮箱。只读；⚠️ 后端目前没有读接口，取不到就不展示该行。 */
  email: string
  /** 个人站点；为空则不展示该行。 */
  website: string
  /** 年龄；0 表示没填（不展示该行）。 */
  age: number
  /** 生日（`YYYY-MM-DD`）；为空则不展示该行。 */
  birthday: string
  /** 电话。 */
  phone: string
  /** 关注者数量；只读。⚠️ 后端没有来源，恒为 0。 */
  followers: number
  /** 正在关注的数量；只读。⚠️ 后端没有来源，恒为 0。 */
  following: number
  /** 加入日期（`YYYY-MM-DD`），只读。⚠️ 后端没有来源，恒为空。 */
  joinedAt: string
  /** 主页正文，Markdown（独立资源）。 */
  detail: string
}

/**
 * 作者（站点主人）的资料 —— `/user` 用，**纯本地静态**，不联网。
 *
 * 为什么单独留一份：未登录的人打开 `/user` 应该能看到「这个站是谁做的」，
 * 而这时候既没有 account 也没有令牌。放本地就不会因为后端挂了变成空白页。
 * 要改作者资料就改这里（或 `tmp/user-dev.md`），改完重新构建即可。
 */
const authorProfile: Omit<UserProfile, 'id'> = {
  name: 'Windy',
  login: 'windyfront',
  // 留空表示使用内置占位头像。
  avatar: '',
  bio: '全栈方向，喜欢把想法做成能跑起来的东西。',
  email: '',
  website: 'https://github.com/Windy-01',
  age: 22,
  birthday: '2004-03-08',
  phone: '13800000000',
  followers: 0,
  following: 0,
  joinedAt: '2024-03-08',
  detail: devDetailSource,
}

/**
 * 作者展示页的资料（`/user`）。
 *
 * `id` 故意留空：它不对应后端任何 userid，空串同时让「ID xxx」那一行不展示
 * （作者没有可展示的主键），也让 `isOwnProfile` 恒为 `false` —— 作者页不该出现「编辑主页」。
 */
export function fetchAuthorProfile(): UserProfile {
  return { id: '', ...authorProfile }
}

/**
 * 按**登录账号**拉取用户资料。
 *
 * 步骤（少一步都会缺东西）：
 * 1. `GET userinfo/{account}/id` → userid（查不到时后端返回 200 + 空体）；
 * 2. `GET userinfo/{userid}/profile` → 简介 / 年龄 / 生日 / 电话 / 站点；
 * 3. `GET userinfo/{userid}/username` → 用户名（**不在 profile 里**）；
 * 4. 头像与 README 各走独立资源，失败不影响资料本体。
 *
 * @param account 主页 URL 里的账号（后端 SQL 是 `account = ? OR email = ?`，邮箱也认）。
 * @throws 账号不存在、后端不可达时抛错，由调用方渲染错误态。
 */
export async function fetchUserProfile(account: string): Promise<UserProfile> {
  const key = account.trim()

  if (key === '') {
    throw new Error('缺少账号参数，无法定位用户。')
  }

  let userid: string

  try {
    userid = await fetchRemoteUserid(key)
  } catch (cause) {
    // 404 也当「没有这个账号」，统一由下面的判断给文案。
    if (cause instanceof ApiError && cause.status === 404) {
      userid = ''
    } else {
      throw cause
    }
  }

  if (userid === '') {
    throw new Error(`没有找到账号为「${key}」的用户。`)
  }

  const profile = await fetchRemoteProfile(userid)

  // 后端 `profile` 只有 5 个字段：id 用刚查到的，账号就是 URL 里那段。
  profile.id = userid
  profile.login = key

  // 用户名走独立接口，取不到就留空（界面回落到「未命名用户」）。
  try {
    const username = await fetchRemoteUsername(userid)

    if (username !== '') {
      profile.name = username

      // 打开的是**自己**的主页：这次 GET 的结果顺手刷进身份缓存，
      // 顶栏（`watch(identity)`）立刻跟着变 —— 别的地方改过名字也能在这里纠正回来。
      if (userid === currentUserid()) {
        saveIdentity({ username })
      }
    }
  } catch {
    // 非致命：标题还有占位。
  }

  // 头像和资料是两个接口，资料体里往往只存「有没有头像」而不存 URL。
  if (profile.avatar.trim() === '') {
    profile.avatar = avatarUrlOf(userid)
  }

  // README 也是独立资源，资料体里不带它。接口 404 表示「还没写过 README」，
  // 保持空串即可 —— 不能因为这一项失败就把整份资料丢掉。
  try {
    profile.detail = await fetchRemoteReadme(userid)
  } catch {
    // 保留资料里可能带回来的 detail（通常是空串）。
  }

  return profile
}

/**
 * 「当前登录用户」的精简资料（顶栏用户区用）。
 *
 * 与 `UserProfile` 分开：顶栏只要 id / 名字 / 账号 / 头像，不需要简介正文那些。
 * 数据来自**身份 cookie**（`identity.ts`）+ 令牌 `sub`，不打网络请求。
 */
export interface CurrentUser {
  /** 用户 id（令牌 `sub` 或 cookie 里的 `userid`）；都拿不到时为空串。 */
  id: string
  /** 用户名；cookie 里没有缓存时为空串（顶栏会回落到账号）。 */
  name: string
  /** 登录账号；老会话可能为空串。 */
  login: string
  /** 头像地址；拿不到 id 时为空串。 */
  avatar: string
}

/**
 * 把登录账号变成适合展示的名字：邮箱只取 `@` 之前的部分。
 *
 * 顶栏空间有限，邮箱当名字显示成 `@someone@example.com` 太怪。
 */
export function accountDisplayName(account: string): string {
  const at = account.indexOf('@')

  return (at > 0 ? account.slice(0, at) : account).trim()
}

/**
 * 拉取「当前登录用户」的精简资料。
 *
 * **不联网**：`username` / `account` / `userid` 都在身份 cookie 里，
 * 由登录成功时写入（见 `auth.ts` 的 `login()`），改名后再刷新一次。
 * 没登录时返回 `null`。
 *
 * @returns 未登录时 `null`；登录但 cookie 还没写上时，字段可能为空串
 *          （顶栏会逐级回落到账号、「已登录」占位）。
 */
export function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (session.value === null) {
    return Promise.resolve(null)
  }

  const id = currentUserid()

  return Promise.resolve({
    id,
    name: currentUsername(),
    login: currentAccount(),
    avatar: id === '' ? '' : avatarUrlOf(id),
  })
}
