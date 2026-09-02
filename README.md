# 企业知识库前端（knowledge-base-frontend）

企业知识库系统的前端工程，提供登录认证、**智能问答**、人员管理、角色管理四大模块。问答支持流式输出、Markdown 渲染与历史记录分页加载。后端位于同级目录 [`../enterprise-knowledge-base`](../enterprise-knowledge-base)。

---

## 一、技术栈

| 类别 | 技术 | 版本 |
| --- | --- | --- |
| 框架 | Vue 3（Composition API + `<script setup>`） | ^3.5 |
| 语言 | TypeScript | ^5.9 |
| 构建 | Vite | ^8.2 |
| 路由 | Vue Router | ^5.3 |
| 状态 | Pinia | ^4.0 |
| UI | Element Plus | ^2.14 |
| HTTP | Axios（普通接口） / fetch（流式接口） | ^1.20 |
| Markdown | marked + DOMPurify | ^18 / ^3.4 |
| 样式 | Sass（scoped SCSS） | ^1.103 |

## 二、项目结构

```
src/
├── api/                  # 接口层（axios 封装 + 各业务 API）
│   ├── http.ts           #   axios 实例：baseURL=/api、token 注入、401/错误统一处理
│   ├── auth.ts           #   登录
│   ├── chat.ts           #   问答流式 + 历史记录分页
│   ├── user.ts           #   人员管理 CRUD
│   └── role.ts           #   角色管理 CRUD
├── stores/
│   └── auth.ts           # Pinia：token / user 的读写与持久化
├── router/
│   └── index.ts          # 路由表 + 全局前置守卫（鉴权/权限）
├── layouts/
│   └── MainLayout.vue    # 主布局：侧边栏 + 顶栏 + 内容区
├── views/
│   ├── login/            # 登录页
│   ├── chat/             # 智能问答页（核心）
│   ├── users/            # 人员管理页
│   └── roles/            # 角色管理页
├── components/           # 问答页拆分出的子组件
│   ├── ChatMessage.vue   #   单条消息（头像 + Markdown + 加载动画）
│   └── ChatInput.vue     #   输入框（自适应高度 + 发送按钮）
├── styles/
│   └── index.scss        # 全局样式 + Markdown 全局样式 + 滚动条
├── types/
│   └── index.ts          # 全局类型（User/Role/ChatMessage/流式事件等）
├── App.vue               # 根组件（仅 router-view）
└── main.ts               # 入口：装配 Pinia/Router/ElementPlus
```

## 三、技术架构

### 3.1 分层

```
视图层（views/components）
   │  调用
   ▼
接口层（api/*）  ──  axios(http.ts) 或 fetch ──►  后端 /api/*
   │  读写
   ▼
状态层（stores/auth.ts，Pinia）
```

- **视图层**只关心交互与展示；**接口层**统一封装请求；**状态层**只持久化登录态（token / user）。
- 除登录态外，各页面的数据（用户列表、角色列表、聊天消息）均为页面内局部状态，不引入全局状态管理，保持简单。

### 3.2 请求链路（双通道）

- **普通接口**：走 [`src/api/http.ts`](src/api/http.ts) 的 axios 实例。请求拦截器注入 `Authorization: Bearer <token>`；响应拦截器统一处理 **401 → 跳登录**、其余错误 → `ElMessage` 提示。
- **流式接口**：问答采用原生 `fetch` + `ReadableStream`（axios 不适合逐块读取），见 [`src/api/chat.ts`](src/api/chat.ts)。

### 3.3 认证与权限（RBAC）

- 登录成功后 JWT 与用户信息写入 `localStorage`（key 为 `token`、`user`），由 [`src/stores/auth.ts`](src/stores/auth.ts) 管理。
- [`src/router/index.ts`](src/router/index.ts) 的全局前置守卫：`public` 路由放行；未登录跳登录；`admin` 路由校验 `user.role === 'admin'`，非管理员跳问答页。
- 侧边栏菜单（[`MainLayout.vue`](src/layouts/MainLayout.vue)）按 `isAdmin` 计算属性动态显隐「人员管理/角色管理」。

---

## 四、核心功能

| 页面 | 路由 | 说明 |
| --- | --- | --- |
| 登录 | `/login` | 手机号/邮箱 + 密码，成功后跳 `/chat` |
| 智能问答 | `/chat` | 流式问答、Markdown 渲染、历史分页加载 |
| 人员管理 | `/users` | 用户 CRUD（仅 admin） |
| 角色管理 | `/roles` | 角色 CRUD + 敏感度权限（仅 admin） |

---

## 五、实现方法（重点解析）

### 5.1 智能问答流式输出

后端以 NDJSON 逐行返回事件：`{"type":"delta","content":"..."}`、`{"type":"done","answer":"..."}`、`{"type":"error","message":"..."}`。前端在 [`src/api/chat.ts`](src/api/chat.ts) 中用 `ReadableStream` 读取：

```ts
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";                      // 关键：暂存跨块被截断的半行
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (line) onEvent(JSON.parse(line));   // 逐行 JSON.parse 后回调
  }
}
```

要点：
- `decoder.decode(value, { stream: true })` 配合缓冲区，正确处理**跨块半行**与中文多字节截断。
- 通过 `AbortController` 实现「停止/清空」时中断请求（`signal` 传入 `fetch`）。

### 5.2 流式渲染的响应式陷阱（重点）

消息用 `ref<ChatMessage[]>` 存储。若把普通对象 `push` 进数组后再直接改它的属性，**不会触发视图更新**（普通对象被 `ref` 深响应式包裹时，本地持有的原始引用并非代理）。因此助手消息用 `reactive()` 包裹：

```ts
const assistant = reactive<ChatMessage>({ id, role: "assistant", content: "", status: "streaming" });
messages.value.push(assistant);
// 后续 assistant.content += event.content 才能实时渲染
```

### 5.3 Markdown 渲染与 XSS 防护

- 助手回复经 `marked.parse` 转 HTML，再经 `DOMPurify.sanitize` 消毒，防 XSS 注入（见 [`src/components/ChatMessage.vue`](src/components/ChatMessage.vue)）。
- **Markdown 的样式必须写在全局** [`src/styles/index.scss`](src/styles/index.scss) 的 `.chat-message__markdown` 下：因为内容由 `v-html` 注入，不受组件 `scoped` 样式作用。

### 5.4 历史记录分页加载（上拉加载更多）

- 后端 `GET /api/qa/history?limit=10&before=<id>` 游标分页，按消息 `id`（`BIGSERIAL`，单调递增）降序取一页后反转为时间升序返回 `{ messages, hasMore }`。
- 前端 [`src/views/chat/index.vue`](src/views/chat/index.vue)：
  - `onMounted` 拉取最近 10 条并自动滚到底部；
  - `onScroll` 检测 `scrollTop <= 10` 时触发 `loadOlder()`；
  - **视口不跳动**：加载前记录 `prevHeight = el.scrollHeight`，拼接更早消息后 `el.scrollTop = el.scrollHeight - prevHeight`。
- 游标即 `messages[0].id`（当前最旧一条的 id）。

### 5.5 自动滚动跟随

`watch(messages, autoScroll, { deep: true })` 在内容变化（追加 token）时滚动到底部，但仅当用户原本就在底部（`isAtBottom`）才跟随，避免打断向上翻阅历史。`isAtBottom` 由 `scrollHeight - scrollTop - clientHeight < 10` 实时计算。

---

## 六、注意事项

1. **`id` 类型**：`chat_messages.id` 为 `BIGSERIAL`，pg 驱动以字符串返回，前端 `ChatMessage.id: string` 与之匹配；游标分页靠它，勿改成客户端 UUID。
2. **「清空会话」语义**：只清空当前界面（`messages = []`），**不删除服务端历史**，刷新后历史仍会加载回来。清空时需同步重置 `hasMore`、`isAtBottom`，避免用客户端 UUID 当游标触发错误请求。
3. **后端无会话记忆**：后端每次问答都生成新 `thread_id`（`user-<id>-session-<Date.now()>`），故历史按用户平铺、无会话分组，也不保留多轮上下文。
4. **登录态存储**：token/user 存在 `localStorage`（非 httpOnly Cookie），注意 XSS 面；Markdown 已用 DOMPurify 消毒是必要防线。
5. **流式接口不要走 axios**：需逐块读取 body，改用 `fetch` + `ReadableStream`。
6. **代理配置**：开发环境 Vite 把 `/api` 代理到 `http://localhost:3000`（见 [`vite.config.ts`](vite.config.ts)），前后端端口不一致时改这里。

---

## 七、本地运行

```bash
# 前端
pnpm install
pnpm dev          # 默认 http://localhost:5173

# 类型检查 / 构建
pnpm typecheck
pnpm build
```

依赖后端在 `http://localhost:3000` 提供 `/api` 接口（见 `../enterprise-knowledge-base`，需先建表并启动）。测试账号：`admin@example.com / Password123!`。

## 八、后端接口约定

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/login` | 登录，返回 `{ token, user }` |
| POST | `/api/qa/stream` | NDJSON 流式问答（`delta`/`done`/`error`） |
| GET | `/api/qa/history` | 历史分页 `?limit&before` → `{ messages, hasMore }` |
| GET/POST/PUT/DELETE | `/api/users` | 人员管理（admin） |
| GET/POST/PUT/DELETE | `/api/roles` | 角色管理（admin） |

> 后端认证用 `Authorization: Bearer <JWT>`，JWT 载荷含 `{ id, role }`；`/api/qa` 需登录 + 权限过滤，`/api/users`、`/api/roles` 还需 admin。
