# 后端接口清单

本文档汇总 windy-front 目前**已经约定好的全部后端接口**，包括已接入的和只预留了契约、还没接的。

- 代码里的**单一事实来源**是 `src/api/*.ts` 的文件头注释；本文件是汇总视图，改接口时两边都要同步。
- 路径是**相对路径**，实际地址 = `config.apiBaseUrl` + 路径（见下面「网络层约定」）。
- 路径里的 `:id` 是 **URL 路径参数**的写法（和前端路由 `/user/:id` 同源），实际请求时会被替换成真实值。

## 目录

| 分组            | 接口数 | 状态                       |
| ------------- | --- | ------------------------ |
| [认证](#认证)     | 3   | ✅ 已接入，真实发请求              |
| [聊天](#聊天)     | 3   | ⏳ 只预留契约，当前返回本地演示数据 / 未接入 |
| [文档](#文档)     | 1   | ⏳ 只预留契约，当前读本地静态 markdown |
| [用户](#用户)     | 2   | ⏳ 只预留契约，当前读本地注册表 / 留空    |
| [帖子统计](#帖子统计) | —   | ❓ 尚未约定路径                 |

## 网络层约定

所有请求都必须经过 `src/api/http.ts`（站内唯一网络出口），业务模块**不要自己 `fetch`、不要自己拼 base url、不要自己写 `Authorization`**。

**地址**

- 前缀取设置 → 网络里的「API Base URL」（`config.apiBaseUrl`），由 `normalizeApiBaseUrl()` 规整。
- **留空或格式错误都回落到「与站点同源」的相对路径**。合法值必须是 `http:` / `https:` 绝对地址。
- 查询参数用 `query` 选项传，值为 `undefined` / `null` 的键会被跳过。

**鉴权**

- 默认 `auth: true`：本地有会话就自动带上 `Authorization: Bearer <token>`（令牌存在 `localStorage` 的 `windy-session`）。
- 公开接口（登录 / 注册）显式传 `auth: false`。
- ⚠️ 带上该请求头会触发 **CORS 预检**，后端必须放行 `Authorization`。
- ⚠️ **带鉴权的请求收到 401 会自动清掉本地会话**（`auth: false` 的登录 / 注册不受影响），界面随之回到未登录。
- 会话结构 `{ token, tokenType, account }`。其中 `account` 是**前端本地记录**（登录时填的账号），仅用于 `GET /users/me` 接入前在界面上区分「当前登录的是谁」，后端无需感知。

**编解码与错误**

- 请求体传对象会自动 JSON 序列化并带上 `Content-Type: application/json`；响应体自动按 JSON 解析。
- 非 2xx 与「请求根本没发出去」统一抛 `ApiError { status, body }`，`message` 可直接展示给用户。
- `status === 0` 表示请求根本没发出去（断网 / 服务未启动 / 跨域被拦）。
- 204 或空响应返回 `undefined`；请求被 `AbortSignal` 取消时原样抛 `AbortError`，不包装成 `ApiError`。
- ⚠️ 错误文案提取会**过滤 HTML 错误页与超过 200 字符的长文本**。

---

## 认证

`src/api/auth.ts` — ✅ **已接入**，会真实发请求。

路径**不带 `/auth` 前缀**。

### `POST /login`

登录。成功后令牌交给会话层保存。

**请求体**

| 字段         | 类型       | 说明        |
| ---------- | -------- | --------- |
| `account`  | `string` | 账号：用户名或邮箱 |
| `password` | `string` | 密码        |

**响应体**

| 字段           | 类型       | 说明                   |
| ------------ | -------- | -------------------- |
| `token`      | `string` | 访问令牌                 |
| `token_type` | `string` | 令牌类型，当前固定返回 `Bearer` |

- 鉴权：`auth: false`（公开接口）
- ⚠️ 前端会校验响应里的 `token` 非空，为空则抛「登录响应里没有可用的 token，无法保存登录状态。」
- 登录**不再返回用户信息**，只返回令牌

### `POST /register`

注册。**不会**自动登录，用户需要再走一次登录流程。

**请求体**

| 字段         | 类型       | 说明                                     |
| ---------- | -------- | -------------------------------------- |
| `account`  | `string` | 账号：用户名（注意字段名是 `account`，不是 `username`） |
| `email`    | `string` | 邮箱                                     |
| `password` | `string` | 密码                                     |

**响应**：只返回状态码，无响应体。

- 鉴权：`auth: false`（公开接口）

### `GET /logout`

退出登录。无参数。

**响应**：只返回状态码，无响应体。

- 鉴权：`auth: true`（会带上当前令牌）
- ⚠️ **只尝试通知后端、不校验结果**：无论返回 2xx / 4xx，还是压根没连上，本地会话都会被清除，
  且 `logout()` **不会抛错**，页面直接回首页 —— 用户点「退出登录」的意图是明确的，
  服务端是否成功吊销令牌不该阻塞本地退出

---

## 聊天

`src/api/chat.ts` — ⏳ **只预留契约，一个请求都不发**。

目前 `fetchConversations()` / `fetchMessages()` 返回 Promise 化的**本地演示数据**，`sendMessage()` 调用即抛「发送消息接口尚未接入，当前只在本地演示。」接入时把函数体换成通信层调用即可，视图层一行都不用改。

### `GET /chat/conversations`

会话列表。

**响应体**：`ChatConversation[]`

| 字段            | 类型                             | 说明                            |
| ------------- | ------------------------------ | ----------------------------- |
| `id`          | `string`                       | 会话 id，也是消息里的 `conversationId` |
| `name`        | `string`                       | 会话名称：单聊是对方名字，群聊是群名            |
| `avatar`      | `string`                       | 头像地址；为空时界面用名称首字生成占位头像         |
| `kind`        | `'direct' \| 'group' \| 'bot'` | 单聊 / 群聊 / 系统通知                |
| `memberCount` | `number`                       | 群聊成员数；非群聊为 0                  |
| `lastMessage` | `string`                       | 最后一条消息的摘要，列表里单行截断展示           |
| `updatedAt`   | `string`                       | 最后一条消息的时间，**ISO 字符串**         |
| `unread`      | `number`                       | 未读数；0 表示没有未读                  |

> ⚠️ 列表顺序由前端**按 `updatedAt` 倒序派生**，不依赖后端返回顺序。

### `GET /chat/conversations/:id/messages`

某个会话的消息记录。

**路径参数**

| 参数   | 说明                              |
| ---- | ------------------------------- |
| `id` | 会话 id，前端会做 `encodeURIComponent` |

**响应体**：`ChatMessage[]`

| 字段               | 类型                                          | 说明                        |
| ---------------- | ------------------------------------------- | ------------------------- |
| `id`             | `string`                                    | 消息 id                     |
| `conversationId` | `string`                                    | 所属会话 id                   |
| `authorName`     | `string`                                    | 发送者名称；自己发出的消息也带上（便于群聊区分）  |
| `outgoing`       | `boolean`                                   | 是否是自己发出的 —— 决定气泡在左还是在右    |
| `content`        | `string`                                    | 消息正文，**纯文本**（保留换行）        |
| `sentAt`         | `string`                                    | 发送时间，**ISO 字符串**          |
| `status`         | `'sending' \| 'sent' \| 'read' \| 'failed'` | 发送状态，只对 `outgoing` 的消息有意义 |

### `POST /chat/messages`

发送消息。**当前调用即抛错，尚未接入。**

**请求体**

| 字段               | 类型       | 说明      |
| ---------------- | -------- | ------- |
| `conversationId` | `string` | 目标会话 id |
| `content`        | `string` | 消息正文    |

**响应**：无响应体（前端按 `void` 处理）。

---

## 文档

`src/api/documents.ts` — ⏳ **只预留契约**，目前读本地注册表 + `tmp/` 下的静态 markdown。

> `about` 栏目**不走这个接口**，它直接读仓库里的 `README.md`，是纯静态资源。

### `GET /documents/:id`

按 id 拉取文档正文。

**路径参数**

| 参数   | 说明                                                          |
| ---- | ----------------------------------------------------------- |
| `id` | 文档 id，与前端路由 `/document/:id` 的参数一致，前端会做 `encodeURIComponent` |

**响应体**：`DocumentDetail`

| 字段       | 类型       | 说明            |
| -------- | -------- | ------------- |
| `id`     | `string` | 文档 id，与路由参数一致 |
| `title`  | `string` | 文档标题          |
| `source` | `string` | Markdown 正文   |

> 前端在文档不存在时渲染错误态，所以「找不到」应当返回非 2xx。

---

## 用户

`src/api/users.ts` — ⏳ **只预留契约**，目前读本地注册表 + `tmp/` 下的静态 markdown。

### `GET /users/:id`

按 id 拉取用户公开资料。

**路径参数**

| 参数   | 说明                                                      |
| ---- | ------------------------------------------------------- |
| `id` | 用户 id，与前端路由 `/user/:id` 的参数一致，前端会做 `encodeURIComponent` |

**响应体**：`UserProfile`

| 字段          | 类型       | 说明                                 |
| ----------- | -------- | ---------------------------------- |
| `id`        | `string` | 用户 id，与路由参数一致                      |
| `name`      | `string` | 显示名                                |
| `login`     | `string` | 登录名（`@handle`）                     |
| `avatar`    | `string` | 头像地址；为空时使用内置占位头像                   |
| `bio`       | `string` | 一句话简介                              |
| `followers` | `number` | 关注者数量                              |
| `following` | `number` | 正在关注的数量                            |
| `company`   | `string` | 所属公司；为空则不展示该行                      |
| `location`  | `string` | 所在地；为空则不展示该行                       |
| `website`   | `string` | 个人站点；为空则不展示该行                      |
| `joinedAt`  | `string` | 加入日期，格式 `YYYY-MM-DD`，展示为「Joined …」 |
| `detail`    | `string` | 主页正文，Markdown                      |

> 前端在用户不存在时渲染错误态，所以「找不到」应当返回非 2xx。

### `GET /users/me`

拉取**当前登录用户**的精简资料，供顶栏用户区展示。

- 鉴权：`auth: true`（必须带 `Authorization: Bearer <token>`）
- 令牌失效时返回 **401** —— 通信层收到带鉴权的 401 会**自动清掉本地会话**，界面随之回到未登录

**响应体**：`CurrentUser`

| 字段       | 类型       | 说明                    |
| -------- | -------- | --------------------- |
| `id`     | `string` | 用户 id，与路由 `/user/:id` 一致 |
| `name`   | `string` | 显示名                   |
| `login`  | `string` | 登录名（`@handle`）         |
| `avatar` | `string` | 头像地址；为空时使用内置占位头像      |

> ⚠️ 前端目前是**留空实现**（`fetchCurrentUser()` 恒返回 `null`）：顶栏在没有资料时
> 显示「已登录」占位文案。接口就绪后只改该函数体，调用方不用动。

---

## 帖子统计

`src/api/postStats.ts` — ❓ **尚未约定路径**。

目前 `fetchPostStats(postId)` 统一返回零值，文件里只留了「真实接口接入后，这里改为携带 `postId` 发起请求」的注释。

**响应体**：`PostStats`

| 字段         | 类型       | 说明  |
| ---------- | -------- | --- |
| `views`    | `number` | 浏览量 |
| `likes`    | `number` | 点赞数 |
| `comments` | `number` | 评论数 |

> 接入时需要先定路径（例如 `GET /posts/:id/stats`），再把 `fetchPostStats` 的函数体换成 `getJson`。

---

## 注意事项

**⚠️ 认证接口路径与前端路由同名**

`/login`、`/register`、`/logout` 既是**前端页面路由**（`src/router/index.ts`），也是**后端接口路径**。

当 `apiBaseUrl` 留空（与站点同源）时，`POST /login` 和访问 `/login` 页面会是同一个 origin 下的同一个路径。后端部署时要么把接口挂到独立域名 / 路径前缀下（在设置 → 网络里填 `apiBaseUrl`），要么在服务端按请求方法区分。

**⚠️ 未定的部分**

- 聊天记录的存储格式、读写时机、文件管理尚未实现，`config.chatStorage` 目前只是占位。
- `POST /chat/messages` 的响应体还没定（当前按 `void` 处理）；是否返回服务端生成的消息 id / 时间戳待定。
- 帖子统计接口的路径未定。
- 收到 401 后**清会话**已统一处理（`http.ts`），但**跳转登录页**还没做 —— 目前只是界面退回未登录。
