/**
 * 用户资料接口 `userinfo/*`。
 *
 * 六接口，**三个写、三个读**，头像与 README 都是独立资源：
 *
 * | 方法   | 路径                              | 用途                             |
 * | ---- | ------------------------------- | ------------------------------ |
 * | POST | `userinfo/update/avatar`        | 上传头像（multipart，字段 `file`）      |
 * | POST | `userinfo/update/readme`        | 上传主页正文（multipart，字段 `file`）     |
 * | POST | `userinfo/update/profile`       | 保存资料（**JSON**，不含头像与正文）        |
 * | GET  | `userinfo/{userid}/avatar`      | 取头像图片                         |
 * | GET  | `userinfo/{userid}/readme`      | 取主页正文                         |
 * | GET  | `userinfo/{userid}/profile`     | 取资料                            |
 *
 * ⚠️ **只有头像和正文走 `multipart/form-data`**（字段名 `file`，后端 `MultipartFile file`）；
 * **资料是 `application/json`**，直接发对象。两类请求别混：multipart 的 body 会被
 * `MultipartResolver` 先吃掉，用 `@RequestBody` 读只会得到空流
 * （`Required request body is missing`）。
 *
 * ⚠️ **这里的路径不带 `/api` 之类的前缀**：前缀由设置 → 网络里的 `apiBaseUrl`
 * 提供（用户通常填成 `https://example.com/api`），通信层拼一次就够了。
 * 这里再写一遍会变成 `/api/api/userinfo/...`。
 *
 * ⚠️ **路径里的 `avatar` 是按正确拼写写的**：需求原稿给的是 `avator`（少一个 `a`），
 * 经确认按拼写错误处理。若后端实际保留的是 `avator`，只改下面三个常量即可，
 * 调用方一行都不用动。
 *
 * ⚠️ **资料体里不带 `avatar` / `detail`**：两者体积大、更新频率也不同，
 * 各走独立的 multipart 接口（见 `uploadProfile()` 的说明）。
 *
 * ⚠️ **头像上传前统一处理**：`uploadAvatar()` 内部会调 `normalizeAvatar()`
 * （`utils/avatarImage.ts`），保证后端收到的永远是 512×512 的 PNG，与调用方给什么无关。
 *
 * 鉴权：全部走通信层的默认行为（本地有会话就带 `Authorization: Bearer <token>`）。
 * 上传类接口在令牌失效时收到 401，通信层会自动清会话。
 */

import { normalizeApiBaseUrl, useConfig } from '../config'
import { avatarOutputSize, normalizeAvatar } from '../utils/avatarImage'
import {
  fetchFileRefText,
  parseFileRef,
  resolveImageSrc,
  type FileRef,
} from './fileRef'
import { getJson, postForm, postJson, postText } from './http'
import type { UserProfile } from './users'

/**
 * 头像最终边长（像素）。
 *
 * 实现搬到了 `utils/avatarImage.ts`（那边要同时给裁剪器与上传兜底用），
 * 这里再导出一次，保持 `AvatarCropper` 等既有调用方的 import 不用改。
 */
export { avatarOutputSize }

/**
 * `userinfo` 这一段路径，六个接口共用。
 *
 * 只写资源段，**不写 `/api`** —— 那一层由 `config.apiBaseUrl` 提供。
 */
const userinfoPrefix = '/userinfo'

/** 头像上传地址（`multipart/form-data`）。 */
export const avatarUploadPath = `${userinfoPrefix}/update/avatar`

/** 主页正文上传地址（`multipart/form-data`）。 */
export const readmeUploadPath = `${userinfoPrefix}/update/readme`

/** 资料上传地址（`application/json`，完整对象，**不含身份与只读字段**：id / email / 头像 / 正文 / 用户名）。 */
export const profileUploadPath = `${userinfoPrefix}/update/profile`

/**
 * 用户名（`name`）的修改地址。
 *
 * ⚠️ 用户名**走独立接口**，不随 `update/profile` 一起提交（也不随 profile 一起返回）。
 * ⚠️ **请求体是纯文本**（后端 `@RequestBody String username`），不是 JSON —— 见 `uploadUsername()`。
 * 路径若与后端不同，只改这一个常量。
 */
export const usernameUploadPath = `${userinfoPrefix}/update/username`

/**
 * 头像上传的**表单字段名**。
 *
 * 后端签名是 `postAvatar(@RequestBody MultipartFile file)`，字段名跟参数名一致：`file`。
 * 两个上传接口都用这个名字（后端靠 URL 区分是头像还是正文），改这里就能跟着后端走。
 */
export const avatarFormField = 'file'

/** 主页正文上传的表单字段名（后端同样是 `MultipartFile file`）。 */
export const readmeFormField = 'file'

/** 头像接口路径（相对路径）。 */
export function avatarPathOf(userId: string): string {
  return `${userinfoPrefix}/${encodeURIComponent(userId)}/avatar`
}

/** 主页正文接口路径（相对路径）。 */
export function readmePathOf(userId: string): string {
  return `${userinfoPrefix}/${encodeURIComponent(userId)}/readme`
}

/** 资料接口路径（相对路径）。 */
export function profilePathOf(userId: string): string {
  return `${userinfoPrefix}/${encodeURIComponent(userId)}/profile`
}

/**
 * 用户名接口路径（相对路径）。
 *
 * ⚠️ **用户名不随 `profile` 返回**：资料接口只给 `bio` / `age` / `birthday` / `phone` / `website`，
 * 用户名走这个独立接口。少了这一趟，主页标题与 `@handle` 就会是空的
 * （联通真后端后出现过，因为 mock 当时把 `name` / `login` 塞进了 profile，把问题盖住了）。
 */
export function usernamePathOf(userId: string): string {
  return `${userinfoPrefix}/${encodeURIComponent(userId)}/username`
}

/**
 * 「按账号查 userid」的路径（相对路径）。
 *
 * 主页路由用的是**登录账号**（`/user/{account}`），而其余接口认的是 userid，
 * 所以进页面第一件事是拿它换 id。后端返回裸数字，查不到时是 200 + 空响应体。
 */
export function useridPathOf(account: string): string {
  return `${userinfoPrefix}/${encodeURIComponent(account)}/id`
}

/**
 * 头像的**完整地址**，直接交给 `<img src>`。
 *
 * 这里绕开通信层是刻意的：`<img>` 只认 URL，没法带 `Authorization` 头，
 * 也没法走 `fetch` 那套错误包装。地址按 `config.apiBaseUrl` 拼，
 * 留空时是与站点同源的相对路径。
 */
export function avatarUrlOf(userId: string): string {
  const { config } = useConfig()

  return `${normalizeApiBaseUrl(config.apiBaseUrl)}${avatarPathOf(userId)}`
}

/**
 * 上传头像。
 *
 * ⚠️ **上传前会统一处理一遍**（`normalizeAvatar()`）：不管传进来的是什么图片，
 * 后端收到的都是 `avatarOutputSize × avatarOutputSize` 的 PNG。裁剪器导出的图
 * 本身就合规，会被原样透传（不做二次编码）；只有别的入口塞原图时才现裁。
 *
 * @param image 图片数据，通常是 `AvatarCropper` 用 canvas 导出的 `Blob`。
 * @param fileName 传给后端的文件名，只影响 `Content-Disposition`。
 * @returns 后端若在响应体里回了文件引用（图片地址 / 签名链接），解析后返回；
 *          只回状态码时返回 `null`，调用方按约定拼 `avatarUrlOf()` 即可。
 */
export async function uploadAvatar(
  image: Blob,
  fileName = 'avatar.png',
): Promise<FileRef | null> {
  const normalized = await normalizeAvatar(image)

  const form = new FormData()
  // 第三个参数给文件名：有些后端会按后缀判断类型，缺省时浏览器会填成 "blob"。
  form.append(avatarFormField, normalized, fileName)

  return parseFileRef(await postForm<unknown>(avatarUploadPath, form))
}

/**
 * 上传主页正文（Markdown 源文本）。
 *
 * 走独立接口而不是塞进资料 JSON，因为它是「文件」：可能几十 KB，
 * 更新频率也和资料字段完全不同。
 *
 * @returns 后端若回了文件引用则返回，只回状态码时返回 `null`。
 */
export async function uploadReadme(source: string): Promise<FileRef | null> {
  const form = new FormData()
  // 带上 charset：后端按 UTF-8 读才不会把中文解成乱码。
  const blob = new Blob([source], { type: 'text/markdown;charset=utf-8' })
  form.append(readmeFormField, blob, 'readme.md')

  return parseFileRef(await postForm<unknown>(readmeUploadPath, form))
}

/**
 * 把后端给的文件引用变成能直接喂给 `<img src>` 的地址。
 *
 * 三种形态都在 `fileRef.ts` 里处理：普通地址 / 签名链接直接用，
 * 相对路径按 `config.apiBaseUrl` 补全。`null`（后端只回状态码）返回空串，
 * 调用方据此回落到「按 id 拼接口地址」。
 */
export function imageSrcOfRef(ref: FileRef | null): string {
  if (ref === null) {
    return ''
  }

  const { config } = useConfig()

  return resolveImageSrc(ref, normalizeApiBaseUrl(config.apiBaseUrl))
}

/**
 * 资料里**真正提交**的字段。
 *
 * 挑出这 5 个而不是 `Omit`，是为了让「资料体到底有哪些字段」一眼可见：
 * - `avatar` / `detail`：各自有独立的 multipart 接口；
 * - `name`：走独立的 `update/username`；
 * - `email` / `login` / `followers` / `following` / `joinedAt`：只读，前端不改。
 *
 * ⚠️ **连 `id` 也不发**：这个接口带 `Authorization: Bearer <token>`，
 * 后端用令牌里的 `sub` 定位用户即可。请求体里再塞一个 id 既冗余又危险 ——
 * 那是客户端可控的值，后端一旦信它，就能改到别人的资料上。
 */
export type UserProfilePayload = Pick<
  UserProfile,
  'bio' | 'website' | 'age' | 'birthday' | 'phone'
>

/**
 * 保存资料。
 *
 * 提交**完整对象**（不是局部 patch）：后端拿到什么就是什么，不需要判断「哪些字段没传」。
 *
 * ⚠️ **走 `application/json`**（不是 multipart）：资料是结构化数据，直接发对象即可，
 * 与头像 / 正文这两个「文件」接口不同 —— 那两个才是 `multipart` + 字段 `file`。
 *
 * ⚠️ **身份来自令牌，不来自请求体**：不带 `id`（也不带 `avatar` / `detail` / `name` / `email`）。
 * 后端要「改谁」请看 `Authorization` 里的 `sub`，别读 body。
 */
export async function uploadProfile(profile: UserProfile): Promise<void> {
  const payload: UserProfilePayload = {
    bio: profile.bio,
    website: profile.website,
    age: profile.age,
    birthday: profile.birthday,
    phone: profile.phone,
  }

  await postJson<void>(profileUploadPath, payload)
}

/**
 * 修改用户名。
 *
 * ⚠️ 与资料分开提交：用户名是登录标识，后端有独立的校验（唯一性、长度、敏感词），
 * 失败语义也和普通资料字段不同 —— 混在 `update/profile` 里会让「改简介失败」
 * 和「改名字失败」共用一条错误提示。
 *
 * ⚠️ **请求体是纯文本，不是 JSON**：后端签名是 `@RequestBody String username`，
 * 它把 body **原样**当用户名存下去。发 `{ "name": "..." }` 会存成一整段 JSON
 * （而且 Jackson 也可能直接 400）。所以这里走 `postText()`，body 就是名字本身。
 */
export async function uploadUsername(name: string): Promise<void> {
  await postText<void>(usernameUploadPath, name.trim())
}

/**
 * 从任意值里取第一个可用的字符串。
 *
 * ⚠️ **空串算「没有」**：后端经常把未填的列序列化成 `""` 而不是省略字段，
 * 若让 `""` 占住第一个键，后面真正有值的别名就永远取不到了
 * （`{ name: "", username: "windy" }` 会得到空名字）。
 */
function pickString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === 'string' && value.trim() !== '') {
      return value
    }

    // 后端可能把数字型 id 直接给成 number。
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }

  return ''
}

/** 从任意值里取第一个可用的数字；缺失 / 非数字都当 0。 */
function pickNumber(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return 0
}

/** 从任意值里取第一个能当图片地址用的值；都没有就返回空串。 */
function pickImageSrc(record: Record<string, unknown>, ...keys: string[]): string {
  const { config } = useConfig()
  const base = normalizeApiBaseUrl(config.apiBaseUrl)

  for (const key of keys) {
    const src = resolveImageSrc(record[key], base)

    if (src !== '') {
      return src
    }
  }

  return ''
}

/**
 * 从任意值里取第一个「内联正文」。
 *
 * 只认内联形态：如果这个字段给的是地址 / 签名链接，正文得由
 * `fetchRemoteReadme()` 再去取一次，这里返回空串把位置让给它。
 */
function pickInlineText(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const ref = parseFileRef(record[key])

    if (ref !== null && ref.kind === 'inline') {
      return ref.text
    }
  }

  return ''
}

/**
 * 把后端返回的 JSON 规整成 `UserProfile`。
 *
 * 后端字段名可能是 camelCase 也可能是 snake_case（Java 实体默认会序列化成前者，
 * 但配置了 `SNAKE_CASE` 就是后者），这里两种都认；缺失字段一律补空值 / 0，
 * 避免界面因为一个字段没返回就整页报错。
 *
 * ⚠️ `avatar` 与 `detail` 走 `fileRef.ts`：后端可能给图片/正文本身，也可能给
 * 普通地址或签名链接，三种形态都要认（见该文件头部的说明）。
 */
export function normalizeProfile(raw: unknown, fallbackId: string): UserProfile {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('资料接口返回的不是一个对象。')
  }

  const record = raw as Record<string, unknown>

  return {
    id: pickString(record, 'id', 'userId', 'user_id') || fallbackId,
    name: pickString(record, 'name', 'username', 'nickname', 'displayName', 'display_name'),
    login: pickString(record, 'login', 'account', 'handle'),
    avatar: pickImageSrc(record, 'avatar', 'avatarUrl', 'avatar_url'),
    bio: pickString(record, 'bio', 'signature', 'intro'),
    email: pickString(record, 'email', 'mail'),
    website: pickString(record, 'website', 'blog', 'homepage', 'site'),
    // 年龄按数字收：后端给 `"22"` 这种字符串也认，缺失 / 非数字一律 0（界面据此不展示该行）。
    age: pickNumber(record, 'age'),
    birthday: pickString(record, 'birthday', 'birth', 'birthDate', 'birth_date'),
    phone: pickString(record, 'phone', 'telephone', 'tel', 'mobile'),
    followers: pickNumber(record, 'followers', 'followerCount', 'follower_count'),
    following: pickNumber(record, 'following', 'followingCount', 'following_count'),
    joinedAt: pickString(record, 'joinedAt', 'joined_at', 'createdAt', 'created_at'),
    detail: pickInlineText(record, 'detail', 'readme', 'content'),
  }
}

/**
 * 拉取某个用户的资料。
 *
 * @throws 接口不可达或返回非 2xx 时抛 `ApiError`；返回体结构不对时抛 `Error`。
 *         由调用方决定是回落默认资料还是渲染错误态。
 */
export async function fetchRemoteProfile(userId: string): Promise<UserProfile> {
  const raw = await getJson<unknown>(profilePathOf(userId))

  return normalizeProfile(raw, userId)
}

/**
 * 取用户名（`GET /userinfo/{userid}/username`）。
 *
 * 后端**只回一个字段**：
 *
 * ```json
 * { "username": "windyfront" }
 * ```
 *
 * ⚠️ **只认 `username`**，不做别名猜测（`name` / `userid` 之类一概不认）：
 * 接口就这一个字段，多写几层兜底反而会把「后端字段写错了」这种问题悄悄盖住。
 * 字段缺失 / 类型不对 / 非对象一律返回空串，界面回落到「未命名用户」。
 *
 * ⚠️ **用户名不随 `profile` 返回**，主页标题与顶栏都靠这一趟。
 *
 * @throws 接口不可达 / 非 2xx 时抛 `ApiError`，由调用方决定是否忽略（取不到不算致命）。
 */
export async function fetchRemoteUsername(
  userId: string,
  signal?: AbortSignal,
): Promise<string> {
  const raw = await getJson<unknown>(usernamePathOf(userId), { signal })

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return ''
  }

  const value = (raw as Record<string, unknown>).username

  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 按**登录账号**查 userid（`GET /userinfo/{account}/id`）。
 *
 * 后端返回的是一个**裸数字**（`10086`），不是对象；查不到时是 200 + 空响应体
 * （`Long` 为 `null`），所以这里返回空串表示「没有这个账号」。
 *
 * ⚠️ 后端的 SQL 是 `WHERE account = ? OR email = ?`，所以邮箱也能命中 ——
 * 用邮箱登录的用户拿邮箱当 `account` 打开主页同样能用。
 *
 * @throws 接口不可达 / 非 2xx 时抛 `ApiError`。
 */
export async function fetchRemoteUserid(
  account: string,
  signal?: AbortSignal,
): Promise<string> {
  const raw = await getJson<unknown>(useridPathOf(account), { signal })

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw)
  }

  if (typeof raw === 'string') {
    return raw.trim()
  }

  // 空响应（`undefined`）/ `{ id }` 形态都认一下，别因为形状变了就整页报错。
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return pickString(raw as Record<string, unknown>, 'id', 'userid', 'userId')
  }

  return ''
}

/**
 * 拉取主页正文（Markdown 源文本）。
 *
 * 三种形态都认（见 `fileRef.ts`）：
 * - 正文直接在响应体里（纯文本 / `{ content }` / `{ readme }` / `{ detail }`）→ 直接用；
 * - 给的是地址或**签名链接**（对象存储里的 `readme.txt`）→ 再取一次真实内容。
 *
 * 接口不存在 / 404 时抛 `ApiError`，由调用方决定是否当作「没有 README」；
 * 签名链接过期（403）也会抛，调用方同样可以当作「这次读不到」。
 */
export async function fetchRemoteReadme(userId: string, signal?: AbortSignal): Promise<string> {
  const raw = await getJson<unknown>(readmePathOf(userId), { signal })
  const ref = parseFileRef(raw)

  // 204 / 空响应 / 结构不对：当作空正文（用户把 README 清空了）。
  if (ref === null) {
    return ''
  }

  return fetchFileRefText(ref, { signal })
}
