# 后端接口清单

本文档汇总 windy-front 目前**已经约定好的全部后端接口**，包括已接入的和只预留了契约、还没接的。

- 代码里的**单一事实来源**是 `src/api/*.ts` 的文件头注释；本文件是汇总视图，改接口时两边都要同步。
- 路径是**相对路径**，实际地址 = `config.apiBaseUrl` + 路径（见下面「网络层约定」）。
- 路径里的 `:id` 是 **URL 路径参数**的写法（和前端路由 `/user/:id` 同源），实际请求时会被替换成真实值。

## 目录

| 分组            | 接口数 | 状态                       |
| ------------- | --- | ------------------------ |
| [认证](#认证)     | 3   | ✅ 已接入，真实发请求              |
| [聊天](#聊天)     | 3   | ⏳ 只预留契约，当前返回空列表 / 未接入 |
| [文档](#文档)     | 1   | ⏳ 只预留契约，当前读本地静态 markdown |
| [用户](#用户)     | 9   | 🚧 资料 / 头像 / README / 用户名读取 / 按账号查 id 已接；`update/username` 请求体形状待对齐，`/users/me` 暂不需要 |
| [帖子统计](#帖子统计) | —   | ❓ 尚未约定路径                 |

## 网络层约定

所有请求都必须经过 `src/api/http.ts`（站内唯一网络出口），业务模块**不要自己 `fetch`、不要自己拼 base url、不要自己写 `Authorization`**。

> 唯一例外是 `src/api/fileRef.ts`：它要取**第三方存储的签名链接**，既不能拼 base url，也不能带鉴权头
> （详见「文件字段的三种形态」）。除它之外没有第二处直接调 `fetch`。

**地址**

- 前缀取设置 → 网络里的「API Base URL」（`config.apiBaseUrl`），由 `normalizeApiBaseUrl()` 规整。
- ⚠️ **下文所有路径都从资源段开始写，不带 `/api`**：`apiBaseUrl` 通常已经填成 `https://example.com/api`，
  代码里再写一遍就成了 `/api/api/userinfo/...`。要改前缀只改配置，不动代码。
- **留空或格式错误都回落到「与站点同源」的相对路径**。合法值必须是 `http:` / `https:` 绝对地址。
- **例外只有一处**：Agent 界面可以用 `baseUrl` 选项覆盖本次请求的前缀（`config.agentApiBaseUrl`，
  见「与 Agent 对话」）。覆盖值必须**已经是规范化后的地址**，业务路径照旧不带 `/api`。
- 查询参数用 `query` 选项传，值为 `undefined` / `null` 的键会被跳过。

**鉴权**

- 默认 `auth: true`：本地有会话就自动带上 `Authorization: Bearer <token>`（令牌存在 `localStorage` 的 `windy-session`）。
- 公开接口（登录 / 注册）显式传 `auth: false`。
- ⚠️ 带上该请求头会触发 **CORS 预检**，后端必须放行 `Authorization`。
- ⚠️ **带鉴权的请求收到 401 会自动清掉本地会话**（`auth: false` 的登录 / 注册不受影响），界面随之回到未登录。
- 会话结构 `{ token, tokenType, account }`。其中 `account` 是**前端本地记录**（登录时填的账号），
  登录成功后会连同 `username` / `userid` 一起写进身份 cookie `windy-identity`（见「用户」一节）。

**编解码与错误**

- 请求体传对象会自动 JSON 序列化并带上 `Content-Type: application/json`；响应体自动按 JSON 解析。
- **纯文本接口走 `postText()`**：body 是字符串本身、`Content-Type: text/plain;charset=UTF-8`。
  给后端 `@RequestBody String` 那类签名用（如 `update/username`）—— 用 `postJson` 会把整段 JSON 当值存进去。
- **文件上传统一走 `postForm()`**：请求体是 `FormData` 时**不设置** `Content-Type` —— multipart 的 `boundary` 必须由浏览器生成，手写会漏掉它，后端直接解析失败。
- 非 2xx 与「请求根本没发出去」统一抛 `ApiError { status, body }`，`message` 可直接展示给用户。
- `status === 0` 表示请求根本没发出去（断网 / 服务未启动 / 跨域被拦）。
- 204 或空响应返回 `undefined`；请求被 `AbortSignal` 取消时原样抛 `AbortError`，不包装成 `ApiError`。
- ⚠️ 错误文案提取会**过滤 HTML 错误页与超过 200 字符的长文本**。
- ⚠️ `<img src>` 这类标签请求**不经过通信层**，拿不到 `Authorization`；头像地址由 `avatarUrlOf()` 单独拼（见「用户」一节）。

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

`src/api/chat.ts` — ⏳ **只预留契约，一个请求都不发，也没有本地数据**。

目前 `fetchConversations()` / `fetchMessages()` 都返回**空数组**，界面显示各自的空态（列表「暂无会话」/「暂无群聊」、消息区「从左侧选择一个会话开始聊天。」）；`sendMessage()` 调用即抛「发送消息接口尚未接入，当前只在本地演示。」接入时把函数体换成通信层调用即可，视图层一行都不用改。

### `GET /chat/conversations`

会话列表。

**响应体**：`ChatConversation[]`

| 字段            | 类型                                          | 说明                            |
| ------------- | ------------------------------------------- | ----------------------------- |
| `id`          | `string`                                    | 会话 id，也是消息里的 `conversationId` |
| `name`        | `string`                                    | 会话名称：单聊是对方名字，群聊是群名            |
| `avatar`      | `string`                                    | 头像地址；为空时界面用名称首字生成占位头像         |
| `kind`        | `'direct' \| 'group' \| 'bot'`              | 单聊 / 群聊 / 系统通知                |
| `memberCount` | `number`                                    | 群聊成员数；非群聊为 0                  |
| `lastMessage` | `string`                                    | 最后一条消息的摘要，列表里单行截断展示           |
| `updatedAt`   | `string`                                    | 最后一条消息的时间，**ISO 字符串**         |
| `unread`      | `number`                                    | 未读数；0 表示没有未读                  |

> ⚠️ 列表顺序由前端**按 `updatedAt` 倒序派生**，不依赖后端返回顺序。
>
> ⚠️ 「与 Agent 对话」**不属于这里**：它是独立的数据与布局，见下方「与 Agent 对话」一节。

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

## 与 Agent 对话

`src/api/agent.ts` — **发消息是真的打后端**（`POST /agent/chat`），会话历史仍是内存。

**和上面的「聊天」是两套东西**：`chat.ts` 面向人与人 / 群聊（会话列表、未读、群成员），
这里面向「与助手一问一答」（会话历史、消息流、流式回复）。两者的类型与状态互不复用，
只有消息体借用了 `ChatMessage`。

界面在 `ChatAgent.vue`：第一栏的「与 Agent 对话」标签切过去后，第二三栏整体替换为
**历史侧栏 + 居中对话流 + 悬浮输入框**，不再走会话列表那套三栏。

### 地址从哪来

Agent 后端可以**独立于站内后端**，在 Agent 界面右上角的齿轮里填 `ip:port`：

| 优先级 | 来源 | 说明 |
| --- | --- | --- |
| 1 | `config.agentApiBaseUrl` | 齿轮里填的值（cookie `windy-settings`）。**允许不写协议**，`127.0.0.1:8000` 自动补 `http://`；可带路径前缀（`127.0.0.1:8000/api`） |
| 2 | `config.apiBaseUrl` | 没填专用地址时回落（设置 → 网络里的 API Base URL） |
| 3 | 都没有 | 不发请求，回一条明确标注的本地演示文案 |

> ⚠️ 路径常量 `agentChatPath = '/agent/chat'` **不写 `/api`**，前缀由上面两处提供。
> ⚠️ 走专用地址时**不带** `Authorization`（那是用户自己的服务，不该收到站内令牌）；
> 回落到全局地址时照常带。
> ⚠️ 专用地址要求对方允许跨域（`Access-Control-Allow-Origin`），否则会以
> `ApiError.status === 0` 的形式失败，界面提示「无法连接到 Agent 后端」。

### 已实现

| 方法   | 路径           | 说明 |
| ---- | ------------ | ---- |
| `POST` | `/agent/chat` | 发送一条消息，body `{ sessionId, message }` |

**响应是宽容解析的**，后端用哪个键都能接上（`extractReply()`）：

- `{ reply }` / `{ content }` / `{ message }` / `{ answer }` / `{ text }` / `{ response }` / `{ output }` / `{ result }`
- `{ data: { … } }` 包一层
- OpenAI 风格 `{ choices: [{ message: { content } }] }` 或 `{ choices: [{ text }] }`
- **纯文本**（`Content-Type: text/plain`）也认

抽不到内容时抛错「后端响应里没有可识别的回复内容」。非 2xx 与「请求没发出去」都会被翻成
一句可直接展示的文案（带状态码 / 地址），显示在对话流末尾的红条里 —— **不写进消息历史**。

### 未实现（等后端定了再补）

| 方法       | 路径                             | 说明 |
| -------- | ------------------------------ | ---- |
| `GET`    | `/agent/sessions`              | 历史会话列表（按 `updatedAt` 倒序） |
| `GET`    | `/agent/sessions/:id/messages` | 某个会话的消息记录 |
| `DELETE` | `/agent/sessions/:id`          | 删除会话 |

`AgentSession` 结构：

| 字段          | 类型              | 说明                          |
| ----------- | --------------- | --------------------------- |
| `id`        | `string`        | 会话 id，也是消息里的 `conversationId`；随每条消息发给后端做上下文串联 |
| `title`     | `string`        | 取首条用户消息截断；空串表示「新对话」         |
| `updatedAt` | `string`        | 最后一条消息的时间，**ISO 字符串**       |
| `messages`  | `ChatMessage[]` | 消息记录；新建的会话是空数组              |

> ⚠️ 现在会话与消息**只存在内存**（`agentSessions` 在模块作用域，切标签不丢、刷新即清空）。
> 要接多轮上下文，后端按 `sessionId` 自己维护即可；前端不做历史回放。
> 若是流式回复，改成 SSE 或 `fetch` + `ReadableStream`，视图层只多一个「逐段追加」的分支。

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

分成两层：

- `src/api/users.ts` —— **数据源入口**。对外只暴露 `fetchUserProfile(account)` / `fetchAuthorProfile()` / `fetchCurrentUser()`，组件不关心数据从哪来。
- `src/userinfo.ts` —— `/userinfo/*` 这组接口的传输层，负责头像、README 与资料的读写。
- `src/identity.ts` —— 身份缓存（cookie `windy-identity`：`username` / `account` / `userid`）。

**三个资源各自独立**：资料（JSON）、头像（图片）、README（Markdown 文件）各有自己的读写接口，
`update/profile` 的请求体里**不含** `avatar` 与 `detail` —— 它们体积大、更新频率也不同，塞进同一个 JSON 里没有好处。
用户名（`name`）也**不随资料体提交**，走独立的 `update/username`。

**路由只有两种形态**（用**登录账号**当路径参数）：

| 路由                | 含义     | 数据来源                                                     |
| ----------------- | ------ | -------------------------------------------------------- |
| `/user`           | 作者展示页  | **本地静态**（`users.ts` 的 `authorProfile`），不联网；已登录也不出「编辑主页」 |
| `/user/{account}` | 某个用户主页 | `GET /{account}/id` 换 userid → `profile` + `username` + 头像 + README |

> ⚠️ **用 account 而不是 userid / username**：account 是登录账号（`useroauth.account`），不可改、唯一；
> username 是显示名，可改 —— 改完名字 URL 不该跟着变。
>
> ⚠️ 后端的 SQL 是 `WHERE account = ? OR email = ?`，所以**邮箱也能当 account 用**
> （用邮箱登录的用户拿邮箱打开自己的主页同样能命中）。
>
> ⚠️ `/user/me` 与 `/user/dev` **已删除**：前者靠保留 id 解析当前用户，与 account 路由冲突；
> 后者被 `/user`（作者页）取代。

拿到 userid 后还会**单独再取一次 README**（取不到就当没有正文，不影响资料本身）。

### 身份缓存 cookie `windy-identity`

登录成功后写入，退出登录 / 收到 401 时清除；改完用户名也会同步一次。

```json
{ "username": "windyfront", "account": "windyfront", "userid": "10086" }
```

- 为什么缓存：`username` 只有一个独立接口（顶栏每页都要显示，不该每次都打）；
  `account` 后端**没有读接口**，只能记登录时填的值；`userid` 就是令牌 `sub`，缓存省一次解 JWT。
- ⚠️ **是缓存不是权威**：`userid` 与令牌 `sub` 不一致时**以令牌为准**（`identity.ts` 的 `currentUserid()`）。
- ⚠️ **`username` 以每次 GET 的结果为准**：顶栏挂载时主动取一次、打开自己的主页时也取一次，
  拿到就写回这份缓存（`saveIdentity()` 在值没变时是空操作，不会触发 `watch(identity)` 循环）。
- ⚠️ 不复用 `windy-settings`：那是站点设置，`resetConfig()` 会整份重置，身份数据混进去会被误清。


### 文件字段的三种形态（`src/api/fileRef.ts`）

`avatar` 与 `detail` 都是「文件」，后端可能给三种形态，前端全部兼容：

| 形态   | 例子                                                                                                            | 前端怎么用                     |
| ---- | ------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 内联   | `"# 标题\n\n正文"`                                                                                               | 直接就是内容，不再发请求              |
| 普通地址 | `"https://cdn.example.com/avatar.png"`                                                                         | 直接交给 `<img src>`；正文则 `fetch` 回来 |
| 签名链接 | `"http://127.0.0.1:9000/test/readme.txt?X-Amz-Algorithm=…&X-Amz-Signature=…"`                                  | 同上，但**有有效期**，且不能带鉴权头      |

字段也可以是对象：前端先找地址字段（`url` / `fileUrl` / `downloadUrl` / `signedUrl` / `presignedUrl` / `href` / `link`），
再找正文字段（`content` / `readme` / `detail` / `data`）。相对路径会按 `config.apiBaseUrl` 补全，绝对地址原样使用。

> ⚠️ **签名链接走裸 `fetch`，不带 `Authorization`**：预签名 URL 的签名只覆盖 host，
> 多带一个自定义头会触发 CORS 预检，而对象存储的 CORS 未必放行这个头 —— 请求会被浏览器直接拦掉。
> 所以 `fileRef.ts` 是**唯一允许直接调 `fetch` 的模块**，不经过 `http.ts`（它要拼 base url、附鉴权头，两条都不适用）。
>
> ⚠️ 签名链接通常几十分钟就过期（例子是 `X-Amz-Expires=1800`），页面长时间停留后图片 / 正文可能失效，
> 刷新即可。前端**不会**把签名链接持久化到 localStorage / cookie。

**展示与下载是两条不同的路径**：

- **展示**（`resolveImageSrc()`）：同步返回地址，交给 `<img src>`，让浏览器自己取 —— 省内存、能走缓存；
- **下载**（`saveFileRefAs()`）：必须先 `fetch` 成 Blob 再触发保存 —— 跨域地址上的 `<a download>` 会被浏览器忽略，点下去只是导航打开。

> 上传接口若在响应体里回了文件引用（图片地址 / 签名链接），前端会直接用它当新头像地址；
> 只回状态码时（当前契约）才按 `avatarUrlOf()` 拼。

> ⚠️ **路径里的 `avatar` 是按正确拼写写的**：需求原稿给的是 `avator`（少一个 `a`），经确认按拼写错误处理。
> 若后端实际保留 `avator`，只改 `src/userinfo.ts` 顶部的路径常量，调用方一行不用动。

### `GET /userinfo/:account/id`

**按登录账号查 userid**。主页路由是 `/user/{account}`，而其余接口认的是 userid，
所以进页面第一件事就是拿它换 id。

**响应体**：**裸数字**，不是对象

```json
10086
```

| 情况      | 响应                                    |
| ------- | ------------------------------------- |
| 查到      | `200` + `10086`                       |
| 查不到     | `200` + **空响应体**（后端 `Long` 为 `null`） |
| 账号非法 / 网络 | 非 2xx（前端按错误处理）                       |

> ⚠️ 后端 SQL 是 `WHERE account = ? OR email = ?`，所以**邮箱也能命中**。
> 前端两种都能用：拿邮箱打开 `/user/windy@example.com` 一样能进到主页。
>
> ⚠️ 「查不到」返回 **200 + 空体**，前端按空串处理并渲染「没有找到账号为 xxx 的用户」。
> 如果后端愿意改成 404，前端同样认（`fetchUserProfile()` 里 404 与空体走同一条分支）。

### `GET /userinfo/:userid/profile`

按 id 拉取用户资料。

**路径参数**

| 参数       | 说明                                                        |
| -------- | --------------------------------------------------------- |
| `userid` | 用户 id —— **取令牌里的 `sub`**（JWT payload 的 `sub`），不是登录账号。前端会做 `encodeURIComponent` |

> ⚠️ 前端从 `Authorization` 里的 JWT payload 解出 `sub`（`decodeTokenSubject()`，**只解不验签**），
> 再拼进 `userinfo/{userid}/...`。所以**后端这几个接口认的是 subject**，不是账号：
> 账号可以改、可以重名，subject 才是稳定的主键。
> 令牌不是 JWT 或没有 `sub` 时，前端才回落到登录账号（兼容老会话）。

**响应体**：`UserProfile`

字段名 camelCase / snake_case 两种都认，缺失字段补空串或 0 —— 不会因为少一个字段就整页报错。

字段分两类，**编辑态只允许改「可改」的那些**：

| 字段          | 类型       | 读写 | 说明                                          |
| ----------- | -------- | -- | ------------------------------------------- |
| `id`        | `string` | 只读 | userid；后端不返回，前端用 `GET /{account}/id` 的结果补     |
| `name`      | `string` | 可改 | 用户名。⚠️ 后端**不在这里返回**，走 `GET /{userid}/username`；修改走 `update/username` |
| `login`     | `string` | 只读 | 登录账号（`@handle`）；后端不返回，前端直接用 URL 里的 `account` |
| `avatar`    | `string \| object` | 独立接口 | 头像：地址、签名链接或 `{ url }` 对象（见上一节）；为空时前端自动拼成 `GET /userinfo/{userid}/avatar` |
| `bio`       | `string` | 可改 | 一句话简介                                       |
| `email`     | `string` | 只读 | 邮箱；⚠️ 后端暂无来源，编辑态不出现，也不随资料体提交               |
| `phone`     | `string` | 可改 | 电话                                          |
| `website`   | `string` | 可改 | 个人站点；为空则不展示该行                               |
| `birthday`  | `string` | 可改 | 生日，`YYYY-MM-DD`；为空则不展示该行                     |
| `age`       | `number` | 可改 | 年龄；`0` / 缺失表示没填，不展示该行                       |
| `followers` | `number` | 只读 | 关注者数量；⚠️ 后端暂无来源，恒为 0                        |
| `following` | `number` | 只读 | 正在关注的数量；⚠️ 同上                               |
| `joinedAt`  | `string` | 只读 | 加入日期，`YYYY-MM-DD`；⚠️ 后端暂无来源，不展示该行           |
| `detail`    | `string \| object` | 独立接口 | 主页正文：可内联、也可给地址 / 签名链接（前端会再取一次）；为空时前端单独取 `GET /userinfo/{userid}/readme` |

- 鉴权：`auth: true`
- 「找不到」返回 404 —— 由 `GET /{account}/id` 那一趟先拦住，这里 404 会渲染错误态

> 展示顺序（前端固定）：简介 → 邮箱 → 电话 → 个人站点 → 生日 → 年龄 → 加入日期 → ID。
> 空字段（空串 / `age === 0`）不展示对应行。

> ⚠️ **后端目前只返回 `bio` / `age` / `birthday` / `phone` / `website` 五个字段**（`OAuth2Server` 的 `ProfileRequest`）。
> 其余字段前端一律按「缺失即空」处理：`id` 来自 `/{account}/id`，`login` 来自 URL 里的 account，
> `name` 来自 `/{userid}/username`，`avatar` / `detail` 各走独立接口，
> `email` / `followers` / `following` / `joinedAt` 目前**没有来源**（不展示 / 显示 0）。

### `GET /userinfo/:userid/username`

用户名。**用户名不随 `profile` 返回**，主页标题与顶栏都靠这一趟 ——
少调它，标题就是空的（联通真后端后踩过）。

**响应体**：只回用户名，没有别的字段

```json
{ "username": "windyfront" }
```

- 鉴权：`auth: true`
- ⚠️ **前端只认 `username` 这一个键**，不做别名猜测（`name` / `userid` 之类一概不认）：
  字段写错时标题会回落到「未命名用户」，问题能立刻暴露，不会被兜底悄悄盖住
- **每次 GET 都会刷新顶栏**：顶栏挂载时主动取一次（不等 cookie 过期），
  打开自己的主页时那一次 GET 也会写回身份缓存 —— 别处改过名字，刷新就能纠正
- ⚠️ **不要把 `account` / `email` 塞进这个接口**：账号就是 URL 里那一段（前端直接用），
  邮箱另有安排。接口保持单一职责，少一层耦合


### `POST /userinfo/update/profile`

保存资料。**提交完整对象**，不是局部 patch：后端拿到什么就是什么，不需要判断「哪些字段没传」。

**请求体**：`application/json`，5 个字段

| 字段         | 类型       | 说明                    |
| ---------- | -------- | --------------------- |
| `bio`      | `string` | 简介                    |
| `phone`    | `string` | 电话                    |
| `website`  | `string` | 个人站点，前端会补全 `https://` |
| `birthday` | `string` | 生日，`YYYY-MM-DD`       |
| `age`      | `number` | 年龄；`0` 表示没填           |

> ⚠️ **请求体里没有 `id`**：改谁由 `Authorization: Bearer <token>` 里的 `sub` 决定。
> 前端**不会**把 userid 塞进 body —— 那是客户端可控的值，后端一旦读它，就可能被用来改别人的资料。
> 后端实现时请从令牌取 subject，不要读 body 里的 id。

> ⚠️ **这个接口是 JSON，不是 multipart**：后端用 `@RequestBody` 接一个**只含这 5 个字段的 DTO** 即可
> （别直接绑 `UserProfile` 实体 —— 那会把 `id` / `followers` 等一起暴露成可写）。
> 只有 `update/avatar` 与 `update/readme` 是文件上传（`@RequestPart("file") MultipartFile file`）——
> 两类接口的注解不能混用，`@RequestBody` 接 multipart 会报 `Required request body is missing`。

> ⚠️ **不含 `avatar` / `detail` / `name` / `email`**：头像走 `update/avatar`，正文走 `update/readme`，
> 用户名走 `update/username`，邮箱是**只读字段**（后端保留原值）。前端是**显式挑字段**构造 JSON 的（`UserProfilePayload = Pick<...>`），
> 不是把 `UserProfile` 直接序列化 —— 这样「资料体到底有哪些字段」一眼可见，
> 也不会因为给类型加字段就悄悄多发数据。

> ⚠️ **只读字段不进请求体**：`id` / `email` / `login` / `followers` / `following` / `joinedAt` 由后端自己维护。

- 鉴权：`auth: true`
- **响应**：只返回状态码，无响应体（前端按 `void` 处理）
- ⚠️ 前端只在 2xx 时更新页面；失败会**保留编辑态**并显示错误，让用户重试

### `POST /userinfo/update/username`

修改用户名。与 `update/profile` **分开**：用户名是登录标识，后端通常有独立校验
（唯一性、长度、敏感词），失败语义也和普通资料字段不同。

**请求体**：**纯文本**（`Content-Type: text/plain;charset=UTF-8`），body 就是名字本身

```text
新用户名
```

- 后端签名是 `@RequestBody String username` —— 它把 body **原样**当值存下去。
  ⚠️ 所以**不能发 JSON**：`{ "name": "新用户名" }` 会被整段存成用户名（Jackson 也可能直接 400）
- 鉴权：`auth: true`
- **响应**：只返回状态码，无响应体
- 前端行为：只有用户名**真的改过**才发这个请求；它失败时**不会**继续提交资料（避免「名字没改成功、其他字段改了」的半吊子状态）
- 成功后前端会把新名字写回身份缓存（`windy-identity`），顶栏立即更新
- ⚠️ 路径常量在 `src/api/userinfo.ts` 的 `usernameUploadPath`，与后端不一致时只改这一处

### `POST /userinfo/update/avatar`

上传头像。

**请求体**：`multipart/form-data`

| 字段     | 类型 | 说明                          |
| ------ | -- | --------------------------- |
| `file` | 文件 | 裁剪后的 PNG，文件名 `avatar.png`，512×512 |

> ⚠️ 字段名就是后端参数名 `file`，**头像与正文两个接口一致**（后端靠 URL 区分资源）。
> 后端要用 **`@RequestPart("file") MultipartFile file`**，**不能**写 `@RequestBody` ——
> multipart 的 body 被 `MultipartResolver` 先消费，`@RequestBody` 读到空流会报
> `Required request body is missing`。要改字段名只需改 `userinfo.ts` 里的 `*FormField`。

- 鉴权：`auth: true`
- **响应**：只返回状态码，无响应体
- ⚠️ 前端**不上传原图**，上传前统一处理成正方形 PNG，分两层保证：
  - `AvatarCropper.vue` —— 用户在浏览器里裁剪（拖动 / 缩放 / 圆形遮罩），canvas 导出 512×512 PNG；
  - `uploadAvatar()` —— 上传前再兜一次底（`utils/avatarImage.ts` 的 `normalizeAvatar()`），
    把任何来源的图片都规整成 512×512 PNG。已合规的会原样透传，不做二次编码。
- 体积上限 1 MB：PNG 没有质量参数可调，超出时按 **512 → 384 → 256** 阶梯缩尺寸，
  所以后端收到的可能是这三个边长之一，但**一定是正方形 PNG**。

### `GET /userinfo/:userid/avatar`

取头像图片。**响应体是图片二进制**（`image/*`），不是 JSON。

- 前端把它直接交给 `<img src>`，地址由 `avatarUrlOf(userid)` 拼（前缀取 `config.apiBaseUrl`）
- ⚠️ `<img>` 拿不到 `Authorization`，这个接口需要**公开可读**（或后端改用 cookie 鉴权）
- 图片加载失败时页面回落到内置占位头像，不会显示破图
- 上传成功后前端会在地址后加 `?v=<时间戳>` 破缓存
- **也可以不走这个接口**：在 `/profile` 的 `avatar` 里直接给图片地址或签名链接，前端会用那个地址（见「文件字段的三种形态」）

### `POST /userinfo/update/readme`

上传主页正文。

**请求体**：`multipart/form-data`

| 字段     | 类型 | 说明                                |
| ------ | -- | --------------------------------- |
| `file` | 文件 | Markdown 源文本，文件名 `readme.md`，UTF-8 |

> ⚠️ 字段名同样是 `file`（`MultipartFile file`），与头像接口一致。

- 鉴权：`auth: true`
- **响应**：只返回状态码，无响应体
- ⚠️ 前端有两个入口：编辑态的 **「保存正文」**（只发这个接口，不动资料）、以及左栏的 **「保存」**
  （正文改过时顺带发一次，避免静默丢失改动）。正文没变化时不会重传几十 KB
- ⚠️ 左栏保存的顺序是**先 README 后资料**：正文传失败就直接中止，不会出现「资料更新了但正文没更新」

### `GET /userinfo/:userid/readme`

取主页正文。

**响应体**：Markdown 源文本（`text/markdown` 或 `text/plain` 都行）。
也接受包一层 JSON 的写法：`{ "content": "..." }` / `{ "readme": "..." }`，前端三种都认。

**也可以只给一个地址**（普通 URL 或对象存储的签名链接，见「文件字段的三种形态」）：

```json
{ "url": "http://127.0.0.1:9000/test/readme.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=…" }
```

前端会再 `fetch` 一次这个链接取正文（**不带 `Authorization`**，否则会被 CORS 预检拦掉）。
链接过期（403）或跨域被拦时，正文按「空」处理，页面照常渲染，不会变成错误页。

- 鉴权：`auth: true`
- **没有 README 时返回 404**（前端据此当作「正文为空」，README 标题标注「空」）
- 返回 204 / 空响应表示**正文被清空**，同样按空处理

### `GET /users/me`（⏳ 未接入，且暂时不需要）

拉取**当前登录用户**的精简资料，供顶栏用户区展示。

> ⚠️ **现在不靠它了**：顶栏的 `id` / `name` / `login` / `avatar` 全部来自
> **身份 cookie**（`windy-identity`，见上文）+ 令牌 `sub`，`fetchCurrentUser()` 不联网。
> 这个契约保留，将来若要做「多端同步显示名」再启用。

- 鉴权：`auth: true`（必须带 `Authorization: Bearer <token>`）
- 令牌失效时返回 **401** —— 通信层收到带鉴权的 401 会**自动清掉本地会话与身份 cookie**

**响应体**：`CurrentUser`

| 字段       | 类型       | 说明                                    |
| -------- | -------- | ------------------------------------- |
| `id`     | `string` | 用户 id —— 与令牌里的 `sub` 一致，可直接用于 `userinfo/{userid}/...` |
| `name`   | `string` | 用户名（`userdetails.username`）            |
| `login`  | `string` | 登录账号（`useroauth.account`）              |
| `avatar` | `string` | 头像地址；为空时使用内置占位头像                      |


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

**⚠️ 头像图片不走通信层，README 走**

`GET /userinfo/{userid}/avatar` 是交给 `<img src>` 的，请求不会带 `Authorization`，
也拿不到 `ApiError` 那套错误包装。所以：

- 这个接口必须**公开可读**，或者后端改用 cookie 鉴权；
- 加载失败时前端静默回落到占位头像，界面上不会出现「接口出错」。

`GET /userinfo/{userid}/readme` 相反：由 `fetchRemoteReadme()` 走通信层拉取，
**会带令牌**、失败也会被捕获。取不到时当作「没有 README」，不影响资料本身。

**⚠️ 前端只负责「按钮该不该出现」**

「编辑主页 / 更换头像」由 `isOwnProfile` 决定（已登录 + 资料已加载 + 页面确实指向自己），
但**这只是界面层的判断**，两个写接口后端仍必须自己校验令牌归属，不能信前端。

**⚠️ 未定的部分**

- 聊天记录的存储格式、读写时机、文件管理尚未实现，`config.chatStorage` 目前只是占位。
- `POST /chat/messages` 的响应体还没定（当前按 `void` 处理）；是否返回服务端生成的消息 id / 时间戳待定。
- 帖子统计接口的路径未定。
- 收到 401 后**清会话**已统一处理（`http.ts`），但**跳转登录页**还没做 —— 目前只是界面退回未登录。
