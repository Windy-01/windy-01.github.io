/**
 * 便签小窗配置。
 *
 * 内容使用 Markdown 任务列表语法（`- [ ]` / `- [x]`），渲染后即为可勾选清单。
 */
export interface StickyNoteConfig {
  /** 窗口标题。 */
  title: string
  /** 便签正文，Markdown 任务列表语法。 */
  content: string
  /** 窗口宽度（px）。 */
  width: number
  /** 初始位置：距视口右边缘 / 上边缘的距离（px）。 */
  offset: {
    right: number
    top: number
  }
  /** 是否默认展开显示（默认关闭，由侧栏「便签」入口打开）。 */
  open: boolean
}

export const stickyNote: StickyNoteConfig = {
  title: '便签',
  content: [
    '- [x] 首页 / Community / Document / Chat 页面骨架',
    '- [x] Markdown 渲染与帖子卡片',
    '- [x] 侧栏设置入口与设置弹窗',
    '- [x] 便签小窗（拖动 / 最小化）',
    '- [ ] 便签的编辑与持久化',
    '- [ ] 站点数据接入',
  ].join('\n'),
  width: 268,
  offset: {
    right: 24,
    top: 104,
  },
  open: false,
}
