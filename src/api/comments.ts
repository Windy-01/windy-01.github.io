/**
 * 评论接口（windsharebase 后端，`/comment`）。
 *
 * 路径**不带 `/api`** —— 前缀由设置 → 网络里的 `apiBaseUrl` 提供。
 *
 * | 方法     | 路径                                      | 说明                       |
 * | -------- | ----------------------------------------- | -------------------------- |
 * | `GET`    | `/comment/:postid`                        | 帖子下所有**一级**评论      |
 * | `GET`    | `/comment/:postid/:commentid`             | 单条评论                   |
 * | `GET`    | `/comment/:postid/:commentid/like`        | 点赞评论                   |
 * | `GET`    | `/comment/:postid/:commentid/like/cancel` | 取消点赞              |
 * | `GET`    | `/comment/list/:commentid/replies`        | 某条评论的所有二级回复      |
 * | `GET`    | `/comment/list/:commentid/thread`         | 二级评论所属的回复链        |
 * | `POST`   | `/comment/reply/:postid`                  | 回复帖子（发一级评论）      |
 * | `POST`   | `/comment/reply/:postid/:commentid`       | 回复评论（发二级评论）      |
 * | `DELETE` | `/comment/:postid/:commentid`             | 删除评论                   |
 *
 * ⚠️ 两个回复接口的 body 都只有 `{ content }` —— 层级（`parent_id` / `root_id` /
 * `reply_to_userid`）由后端按 `:commentid` 自己推导，前端不掺和。
 * ⚠️ 点赞 / 取消同样是 `GET`（后端定的），统一带 `_t` 破浏览器缓存。
 */

import { asRecord, pickBoolean, pickList, pickNumber, pickString, unwrapEnvelope } from './envelope'
import { deleteJson, getJson, postJson } from './http'

/** 一条评论（一级或二级）。 */
export interface PostComment {
  commentId: string
  postId: string
  /** 作者 userid；显示名需要另外查 `GET /userinfo/{userid}/username`。 */
  userId: string
  /** 正文。 */
  content: string
  /** ISO 时间字符串；取不到时为空串。 */
  createdAt: string
  likeCount: number
  replyCount: number
  /** 是否置顶。 */
  isPinned: boolean
  /** 直接父评论 id；一级评论为空串。 */
  parentId: string
  /** 所属根评论 id；一级评论为空串。 */
  rootId: string
  /** 被回复者 userid；空串表示直接回复帖子。 */
  replyToUserId: string
}

/** 回复的请求体：只有正文。 */
export interface CommentReplyPayload {
  content: string
}

const commentPrefix = '/comment'

/* -------------------------------------------------------------------------- */
/* 解析                                                                        */
/* -------------------------------------------------------------------------- */

/** 把一条评论的任意形态规整成 `PostComment`。 */
function normalizeComment(raw: unknown): PostComment {
  const record = asRecord(unwrapEnvelope(raw)) ?? {}

  return {
    commentId: pickString(record, ['comment_id', 'commentId', 'id']),
    postId: pickString(record, ['postid', 'postId', 'post_id']),
    userId: pickString(record, ['userid', 'userId', 'user_id', 'uid']),
    content: pickString(record, ['content', 'text', 'body', 'message']),
    createdAt: pickString(record, ['created_at', 'createdAt', 'createTime', 'create_time']),
    likeCount: pickNumber(record, ['like_count', 'likeCount', 'likes']),
    replyCount: pickNumber(record, ['reply_count', 'replyCount', 'replies']),
    isPinned: pickBoolean(record, ['is_pinned', 'isPinned', 'pinned'], false),
    parentId: pickString(record, ['parent_id', 'parentId']),
    rootId: pickString(record, ['root_id', 'rootId']),
    replyToUserId: pickString(record, ['reply_to_userid', 'replyToUserid', 'reply_to_user_id']),
  }
}

/**
 * 把「列表响应」规整成数组。
 *
 * 后端可能直接回数组，也可能包成 `{ list: [...] }` / `{ comments: [...] }`；
 * 都取不到就当没有数据（返回空数组），调用方不用处理 `undefined`。
 */
function normalizeList(raw: unknown): PostComment[] {
  const data = unwrapEnvelope(raw)

  if (Array.isArray(data)) {
    return data.map(normalizeComment)
  }

  const record = asRecord(data)

  if (record === null) {
    return []
  }

  // 单条评论被当成「列表」返回的情况（例如 thread 只回一条）。
  if (pickString(record, ['comment_id', 'commentId']) !== '') {
    return [normalizeComment(record)]
  }

  return pickList(record, []).map(normalizeComment)
}

/* -------------------------------------------------------------------------- */
/* 路径                                                                        */
/* -------------------------------------------------------------------------- */

function commentPath(postId: string, commentId?: string): string {
  const base = `${commentPrefix}/${encodeURIComponent(postId)}`

  return commentId === undefined ? base : `${base}/${encodeURIComponent(commentId)}`
}

/** 破缓存的查询参数：每次请求都不一样。 */
function noCache(): { _t: number } {
  return { _t: Date.now() }
}

/* -------------------------------------------------------------------------- */
/* 读                                                                          */
/* -------------------------------------------------------------------------- */

/**
 * 拉取帖子下的所有**一级**评论。
 *
 * 二级回复不在这里，点「查看回复」时才走 `fetchReplies()`。
 */
export async function fetchComments(postId: string, signal?: AbortSignal): Promise<PostComment[]> {
  // 进度条：评论区是页面主体的一块，进来就要等它。
  const raw = await getJson<unknown>(commentPath(postId), { signal, progress: true })

  return normalizeList(raw)
}

/** 拉取单条评论；取不到（空响应 / 空对象）时返回 `null`。 */
export async function fetchComment(
  postId: string,
  commentId: string,
  signal?: AbortSignal,
): Promise<PostComment | null> {
  const raw = await getJson<unknown>(commentPath(postId, commentId), { signal, progress: true })
  const comment = normalizeComment(raw)

  return comment.commentId === '' && comment.content === '' ? null : comment
}

/**
 * 拉取某条评论的所有二级回复。
 *
 * ⚠️ **不推动进度条**：它是「查看 N 条回复」点出来的**局部展开**，
 * 只影响那一条评论下面的一小块，按钮自己会切成加载态；
 * 顶上再压一条全宽进度条，观感上像整页都在重载。
 */
export async function fetchReplies(
  commentId: string,
  signal?: AbortSignal,
): Promise<PostComment[]> {
  const raw = await getJson<unknown>(`${commentPrefix}/list/${encodeURIComponent(commentId)}/replies`, {
    signal,
  })

  return normalizeList(raw)
}

/**
 * 拉取某条二级评论所属的回复链（从根评论到它的祖先）。
 *
 * 用于「查看对话」这类跳转场景；顺序按后端返回，前端不重排。
 */
export async function fetchCommentThread(
  commentId: string,
  signal?: AbortSignal,
): Promise<PostComment[]> {
  const raw = await getJson<unknown>(`${commentPrefix}/list/${encodeURIComponent(commentId)}/thread`, {
    signal,
    progress: true,
  })

  return normalizeList(raw)
}

/* -------------------------------------------------------------------------- */
/* 写                                                                          */
/* -------------------------------------------------------------------------- */

/**
 * 点赞 / 取消点赞评论。
 *
 * 后端只回 `response.OK`，没有新计数，界面上的 ±1 由调用方自己算。
 *
 * ⚠️ **不推动进度条**：和帖子点赞同理，本地已经先算完了。
 */
async function commentAction(postId: string, commentId: string, action: string): Promise<void> {
  await getJson<unknown>(`${commentPath(postId, commentId)}/${action}`, { query: noCache() })
}

/** 点赞评论。 */
export function likeComment(postId: string, commentId: string): Promise<void> {
  return commentAction(postId, commentId, 'like')
}

/** 取消点赞评论。 */
export function unlikeComment(postId: string, commentId: string): Promise<void> {
  return commentAction(postId, commentId, 'like/cancel')
}

/**
 * 回复帖子（发一条一级评论）。
 *
 * body 只有 `{ content }`，作者由后端从令牌里取。
 */
export async function replyToPost(postId: string, content: string): Promise<void> {
  const payload: CommentReplyPayload = { content }

  await postJson<unknown>(`${commentPrefix}/reply/${encodeURIComponent(postId)}`, payload, {
    progress: true,
  })
}

/**
 * 回复某条评论（发一条二级评论）。
 *
 * body 同样只有 `{ content }`：`parent_id` / `root_id` / `reply_to_userid`
 * 由后端按 `:commentid` 推导，前端不传层级。
 */
export async function replyToComment(
  postId: string,
  commentId: string,
  content: string,
): Promise<void> {
  const payload: CommentReplyPayload = { content }

  await postJson<unknown>(
    `${commentPrefix}/reply/${encodeURIComponent(postId)}/${encodeURIComponent(commentId)}`,
    payload,
    { progress: true },
  )
}

/** 删除评论。 */
export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await deleteJson<unknown>(commentPath(postId, commentId), { progress: true })
}
