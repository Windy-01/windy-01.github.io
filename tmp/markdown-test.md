# 一级标题 Heading 1

这是一段普通正文段落，用来检查基础行高、字距与段落间距是否舒适。Markdown 支持**加粗文本**、*斜体文本*、***加粗斜体***、~~删除线~~，以及行内的 `inline code` 片段。链接可以写作 [Windy 的 GitHub](https://github.com/Windy-01)，也可以使用自动链接 <https://windy-01.github.io/>。

## 二级标题 Heading 2

段落中如果出现英文与数字混排，比如 Vue 3.5、TypeScript 5、Vite 8，需要确认基线与中文对齐。下面用两个空格制造一次硬换行。  
这一行应该紧跟在上一行下方，而不是另起一段。

### 三级标题 Heading 3

> 这是一段引用文字，用来测试引用块的左边框与缩进。
>
> > 这是嵌套的第二层引用，应该再缩进一级。
>
> 引用块中的第二段文字。

#### 四级标题 Heading 4

无序列表：

- 第一项
- 第二项，包含**加粗**与 `代码`
  - 嵌套子项 A
  - 嵌套子项 B
    - 再嵌套一层
- 第三项

##### 五级标题 Heading 5

有序列表：

1. 第一步
2. 第二步
   1. 子步骤 2.1
   2. 子步骤 2.2
3. 第三步

###### 六级标题 Heading 6

任务列表：

- [x] 已完成的任务项
- [ ] 未完成的任务项
- [ ] 另一个未完成的任务项

---

## 代码块

```ts
interface SearchEngineConfig {
  id: string
  name: string
  icon: string
  pattern: RegExp
  url: string
}

export function resolveSearchEngine(query: string, engines: SearchEngineConfig[]) {
  const normalizedQuery = query.trim()
  return engines.find((engine) => engine.pattern.test(normalizedQuery)) ?? engines[0]
}
```

```css
.markdown-body :deep(pre) {
  padding: 16px;
  overflow-x: auto;
  border-radius: 12px;
  background-color: rgb(15 23 42 / 6%);
}
```

## 表格

| 组件 | 路径 | 状态 |
| --- | --- | --- |
| Clock | `src/components/common/Clock.vue` | 已完成 |
| SearchBox | `src/components/common/SearchBox.vue` | 已完成 |
| ChatMain | `src/components/common/ChatMain.vue` | 开发中 |
| Document | `src/views/document.vue` | 本次改造 |

## 图片

![占位图片](https://www.loliapi.com/acg/pc/)

## 视频嵌入代码

<iframe src="//player.bilibili.com/player.html?bvid=BV1GJ411x7h7&p=1&autoplay=0&danmaku=0&high_quality=1&as_wide=1&hideCoverInfo=1&hideDanmakuButton=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts"></iframe>

## 分隔线与结尾

上面是一条水平分隔线。以下是最后一段正文，用于确认文档结尾的留白。

> 测试要点：标题层级 h1–h6、正文、加粗、斜体、加粗斜体、删除线、行内代码、代码块、引用（含嵌套）、无序列表（含嵌套）、有序列表（含嵌套）、任务列表、表格、链接、自动链接、图片、水平分隔线、硬换行。
