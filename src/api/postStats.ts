/**
 * 帖子统计数据接口。
 *
 * 目前尚未接入真实数据源，`fetchPostStats` 统一返回 0。
 * 后续接真实接口时只需替换函数体（例如换成 HTTP 请求），
 * 调用方 PostCard 不需要做任何改动。
 */

/** 单条帖子的统计项：浏览量 / 点赞数 / 评论数。 */
export interface PostStats {
  /** 浏览量。 */
  views: number
  /** 点赞数。 */
  likes: number
  /** 评论数。 */
  comments: number
}

/** 统计项的零值。返回新对象，避免多个组件共享同一个引用。 */
export function emptyPostStats(): PostStats {
  return {
    views: 0,
    likes: 0,
    comments: 0,
  }
}

/**
 * 拉取指定帖子的统计数据。
 *
 * @param postId 帖子标识，接入真实接口后作为查询参数使用。
 */
export async function fetchPostStats(postId: string): Promise<PostStats> {
  // 预留：真实接口接入后，这里改为携带 postId 发起请求。
  void postId

  return emptyPostStats()
}
