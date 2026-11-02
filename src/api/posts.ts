/**
 * 帖子接口（windsharebase 后端，`/post`）。
 *
 * 路径**不带 `/api`** —— 前缀由设置 → 网络里的 `apiBaseUrl` 提供。
 *
 * | 方法     | 路径                                | 说明                                |
 * | -------- | ----------------------------------- | ----------------------------------- |
 * | `GET`    | `/post/:userid/:postid`             | 查询帖子（正文 + 统计）              |
 * | `GET`    | `/post/:userid/:postid/like`        | 点赞                                |
 * | `GET`    | `/post/:userid/:postid/like/cancel` | 取消点赞                            |
 * | `GET`    | `/post/:userid/:postid/favorite`    | 收藏                                |
 * | `GET`    | `/post/:userid/:postid/favorite/cancel` | 取消收藏                        |
 * | `POST`   | `/post/upload`                      | 发布帖子                            |
 * | `PUT`    | `/post/:userid/:postid`             | 编辑帖子                            |
 * | `DELETE` | `/post/:userid/:postid`             | 删除帖子                            |
 *
 * ⚠️ 点赞 / 收藏 / 取消用 `GET` 是后端定的（不是笔误），照它发；
 * 这类「用 GET 改状态」的接口会被浏览器缓存，所以统一带一个 `_t` 时间戳破缓存。
 *
 * ⚠️ 响应信封是 Go 的 `response.Build{Message, Data}`，**结构体没写 json tag**，
 * 序列化出来是**大写 `Message` / `Data`**。这里做了宽容解析：大写小写都认，
 * `Data` 里再套 `post` / `document` 也能取出来 —— 后端加 tag 或改嵌套都不用动前端。
 */

import { asRecord, pickBoolean, pickNumber, pickString, unwrapEnvelope } from './envelope'
import { deleteJson, getJson, postJson, putJson } from './http'

/**
 * 发布 / 编辑帖子的请求体。
 *
 * 后端 `domain/post.Document` 就是这三个字段（`author` / `title` / `mainText`），
 * 正文 `mainText` 是 Markdown。
 */
export interface PostDocumentPayload {
  /** 作者名（显示用）；真正的 userid 由后端从令牌里取。 */
  author: string
  title: string
  /** Markdown 正文。 */
  mainText: string
}

/** 一篇帖子的展示数据（正文 + 元信息 + 统计）。 */
export interface PostDetail {
  /** 帖子 id；后端没有时用路由参数兜底。 */
  postId: string
  /** 作者 userid；后端没有时用路由参数兜底。 */
  userId: string
  /** 作者显示名。 */
  author: string
  title: string
  /** Markdown 正文。 */
  mainText: string
  /** 摘要；后端没给时由正文截取。 */
  excerpt: string
  /** 封面图引用（地址或对象存储 key）；空串表示没有。 */
  coverImageRef: string
  /** 是否允许评论；后端没给时按「允许」处理。 */
  allowComment: boolean
  likeCount: number
  commentCount: number
  favoriteCount: number
  /** ISO 时间字符串；取不到时为空串。 */
  createdAt: string
  updatedAt: string
}

/** 摘要截取长度：与社区卡片的两行展示大致对齐。 */
const excerptLength = 120

/* -------------------------------------------------------------------------- */
/* 宽容解析：后端 handler 目前还是空壳，字段名与嵌套都还没最终定型              */
/* -------------------------------------------------------------------------- */

/** 把 `{ post: {...}, document: {...} }` 这类嵌套摊平；内层覆盖外层。 */
function flatten(record: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...record }

  for (const key of ['post', 'document', 'detail', 'info']) {
    const nested = asRecord(record[key])

    if (nested !== null) {
      Object.assign(merged, nested)
    }
  }

  return merged
}

/** 正文取不到时用摘要截一段，避免详情页一片空白。 */
function buildExcerpt(source: string): string {
  const plain = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return plain.length > excerptLength ? `${plain.slice(0, excerptLength)}…` : plain
}

/** 把后端返回的任意形态规整成 `PostDetail`。 */
function normalizePost(raw: unknown, fallbackUserId: string, fallbackPostId: string): PostDetail {
  const record = flatten(asRecord(unwrapEnvelope(raw)) ?? {})
  const mainText = pickString(record, [
    'mainText',
    'main_text',
    'content',
    'markdown',
    'text',
    'body',
  ])

  return {
    postId: pickString(record, ['postid', 'postId', 'post_id', 'id']) || fallbackPostId,
    userId: pickString(record, ['userid', 'userId', 'user_id', 'uid']) || fallbackUserId,
    author: pickString(record, ['author', 'username', 'userName', 'user_name', 'name']),
    title: pickString(record, ['title']),
    mainText,
    excerpt: pickString(record, ['excerpt', 'summary', 'description']) || buildExcerpt(mainText),
    coverImageRef: pickString(record, [
      'cover_image_ref',
      'coverImageRef',
      'cover',
      'coverImage',
      'cover_image',
    ]),
    allowComment: pickBoolean(record, ['allow_comment', 'allowComment'], true),
    likeCount: pickNumber(record, ['like_count', 'likeCount', 'likes']),
    commentCount: pickNumber(record, ['comment_count', 'commentCount', 'comments']),
    favoriteCount: pickNumber(record, ['favorite_count', 'favoriteCount', 'favorites']),
    createdAt: pickString(record, ['created_at', 'createdAt', 'createTime', 'create_time']),
    updatedAt: pickString(record, ['updated_at', 'updatedAt', 'updateTime', 'update_time']),
  }
}

/* -------------------------------------------------------------------------- */
/* 路径                                                                        */
/* -------------------------------------------------------------------------- */

const postPrefix = '/post'

/** 单篇帖子的路径；`userid` / `postid` 是数字，仍然过一遍 `encodeURIComponent` 防意外。 */
function postPath(userId: string, postId: string): string {
  return `${postPrefix}/${encodeURIComponent(userId)}/${encodeURIComponent(postId)}`
}

/** 点赞 / 收藏这类「用 GET 改状态」的路径；`_t` 用来破浏览器缓存。 */
function actionPath(userId: string, postId: string, action: string): string {
  return `${postPath(userId, postId)}/${action}`
}

/** 破缓存的查询参数：每次请求都不一样。 */
function noCache(): { _t: number } {
  return { _t: Date.now() }
}

/* -------------------------------------------------------------------------- */
/* 读                                                                          */
/* -------------------------------------------------------------------------- */

/**
 * 查询帖子。
 *
 * @throws `ApiError`：404 表示帖子不存在，`status === 0` 表示连不上后端。
 */
export async function fetchPost(
  userId: string,
  postId: string,
  signal?: AbortSignal,
): Promise<PostDetail> {
  // 进度条：整页内容都等这一趟，属于「影响页面主体」的请求。
  const raw = await getJson<unknown>(postPath(userId, postId), { signal, progress: true })

  return normalizePost(raw, userId, postId)
}

/* -------------------------------------------------------------------------- */
/* 写                                                                          */
/* -------------------------------------------------------------------------- */

/**
 * 点赞 / 取消点赞 / 收藏 / 取消收藏。
 *
 * 后端只回 `response.OK`（`{Message:"suceed"}`），没有新的计数，
 * 所以计数由调用方在本地 ±1。
 *
 * ⚠️ **不推动进度条**（不传 `progress`）：结果本地已经先算出来了，
 * 这一趟只是后台同步，顶上亮一条进度反而像出了错。
 */
async function postAction(userId: string, postId: string, action: string): Promise<void> {
  await getJson<unknown>(actionPath(userId, postId, action), { query: noCache() })
}

/** 点赞帖子。 */
export function likePost(userId: string, postId: string): Promise<void> {
  return postAction(userId, postId, 'like')
}

/** 取消点赞。 */
export function unlikePost(userId: string, postId: string): Promise<void> {
  return postAction(userId, postId, 'like/cancel')
}

/** 收藏帖子。 */
export function favoritePost(userId: string, postId: string): Promise<void> {
  return postAction(userId, postId, 'favorite')
}

/** 取消收藏。 */
export function unfavoritePost(userId: string, postId: string): Promise<void> {
  return postAction(userId, postId, 'favorite/cancel')
}

/**
 * 发布帖子。
 *
 * ⚠️ 路径不带 userid：作者由后端从令牌里取，body 里只有 `author` 显示名。
 */
export async function createPost(payload: PostDocumentPayload): Promise<void> {
  await postJson<unknown>(`${postPrefix}/upload`, payload, { progress: true })
}

/**
 * 编辑帖子。
 *
 * 请求体与发布同形（`{ author, title, mainText }`）；谁能改由 `:userid` 与令牌共同决定。
 */
export async function updatePost(
  userId: string,
  postId: string,
  payload: PostDocumentPayload,
): Promise<void> {
  await putJson<unknown>(postPath(userId, postId), payload, { progress: true })
}

/** 删除帖子。 */
export async function deletePost(userId: string, postId: string): Promise<void> {
  await deleteJson<unknown>(postPath(userId, postId), { progress: true })
}
