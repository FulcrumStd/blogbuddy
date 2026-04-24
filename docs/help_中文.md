# BlogBuddy - AI 驱动的写作助手

[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)

BlogBuddy 是一个 VS Code 扩展，用 AI 增强你的 Markdown 写作流。命令直接嵌在文本里，一个快捷键触发，输出流式实时显示。本文档覆盖从配置到 BB 编辑器、内联命令、常见问题的所有内容。

## 🚀 快速开始

1. **安装** BlogBuddy（VS Code Marketplace）
2. **配置凭证** — 两种方式之一：
   - 在 VS Code 设置里配置 `blogbuddy.apiKey`，**或**
   - 导出环境变量 `BLOGBUDDY_API_KEY`（或 `OPENAI_API_KEY`）
3. **选个模型** — 在命令面板跑 **BlogBuddy: Select Model**。命令会从 provider 的 `/v1/models` 拉列表，你挑一个或输入自定义 id
4. **打开一个 Markdown 文件** 开始写
5. **插入 BB 标签**，按 `Cmd+B Cmd+B` (Mac) / `Ctrl+B Ctrl+B` (Win/Linux) 触发

## 📋 三种使用方式

1. **内联 BB 命令** — 文本里嵌标签，快捷键（`Cmd+B Cmd+B`）触发
2. **BB 编辑器** — 内置 WYSIWYG Markdown 编辑器，带 frontmatter 类型化面板、语法高亮、斜杠菜单（在 Explorer 里 `.md` 上按 `Cmd+B`）
3. **菜单** — `Cmd+Shift+B` 打开菜单（使用统计、帮助等）

当前 Markdown 文件的字数会一直显示在状态栏（没有开关，打开 `.md` 就显示）。

---

## 🏷️ 内联 BB 命令

在文本里嵌指令标签，按 `Cmd+B Cmd+B` (Mac) / `Ctrl+B Ctrl+B` (Win/Linux) 执行。

### 智能范围检测

扩展根据你的光标/选区自动判断处理范围：

- **手动选中**：仅处理选中文本
- **当前行**：光标所在行同时包含 BB 标签和其他内容时，仅处理该行
- **段落（文本块）**：BB 标签单独一行（或光标位于带 BB 标签的段落里）时，处理整个段落（由空行分隔的文本块）
- **全文**：BB 标签单独占据文本块（上下空行隔开）且命令支持全文模式（`bb-impv`、`bb-tslt`、`bb`）时，处理整个文档并生成新文件

### 命令语法

```
<command:可选消息>
```

### 可用的 BB 命令

#### 1. `<bb-expd:扩展要求>` — 文本扩展

**用途**：在保留原意的前提下扩展并阐述已有内容。

```markdown
Machine learning is changing software development.
<bb-expd:make this suitable for a technical blog>
```

**功能**：读取完整文档上下文；保持原语气和风格；添加具体示例；确保与周围内容自然融合。

#### 2. `<bb-impv:风格指令>` — 文本改进

**用途**：提升文本的清晰度、语法和整体质量。

**文本块模式**（标签与内容在同一段落） — 原位改进该段落：

```markdown
This paragraph has some repetitive content that says the same thing multiple times.
<bb-impv:make more concise and remove redundancy>
```

**全文模式**（标签被空行隔离） — 改进整个文档并生成 `*_improved.md` 新文件：

```markdown
Some content above...

<bb-impv:improve the entire document's professional tone>

Some content below...
```

#### 3. `<bb-tslt:目标语言>` — 翻译

**用途**：把整篇文档翻译成指定语言。

```markdown
<bb-tslt:中文>
<bb-tslt:Japanese>
<bb-tslt:Français>
```

**功能**：创建带语言后缀的新文件（如 `myblog_中文.md`）；保留 Markdown 结构和代码块；生成指向翻译版本的 Markdown 链接。

#### 4. `<bb-mmd:图表描述>` — Mermaid 图表

**用途**：根据描述生成 Mermaid 图表。

```markdown
User registration process:
1. User enters email and password
2. System validates credentials
3. If valid, create account
4. Send confirmation email
<bb-mmd:create a flowchart>
```

**输出**：围栏 ` ```mermaid ` 代码块。自动选合适的图表类型（flowchart / sequence / class / state / ER / gantt / pie）。Mermaid 代码会校验合法的图表前缀；VS Code 原生 Markdown 预览即可渲染。

#### 5. `<bb-kwd:关键词重点>` — 关键词提取

**用途**：从文档中提取 8–12 个适合 SEO 的关键词。

```markdown
<bb-kwd:focus on technical terms>
<bb-kwd:>
```

#### 6. `<bb-tldr:摘要风格>` — TL;DR 生成

**用途**：生成一段简洁的"太长不看"摘要。

```markdown
<bb-tldr:focus on actionable insights>
<bb-tldr:>
```

#### 7. `<bb-tag>` — BB 徽章

**用途**：插入 BlogBuddy 署名徽章。

**输出**：`[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)`

#### 8. `<bb:你的指令>` — 通用 AI 任务 ⚠️

**用途**：用任意指令处理文本。

> **⚠️**：最灵活但也最贵的命令。比专用命令更耗 token。能用专用的就别用这个。

**文本块模式** — 处理段落：

```markdown
- Feature 1: Description
- Feature 2: Description
<bb:convert this list to a table format>
```

**全文模式** — 处理整个文档并生成 `*_processed.md`：

```markdown
Some previous content here.

<bb:convert all lists in this document to table format>

Some following content here.
```

---

## 📝 BB 编辑器

扩展内置的所见即所得 Markdown 编辑器。打开方式：Explorer 里右键 `.md` 文件 → **BlogBuddy: Open BB Editor**，或选中文件后按 `Cmd+B`。

### 核心编辑

- **WYSIWYG + GFM**：表格、删除线、任务列表、自动链接、引用块、代码块
- **斜杠菜单（`/`）**：行内插入块类型或 BB 命令
- **Cmd+B Cmd+B 双击组合键**：内联触发任意 `<bb-*>` 标签
- **AI 流式块**：AI 输出以内联块的形式逐 token 显示
- **图片与附件粘贴**：粘贴或拖入文件 — 保存到文档目录或 `blogbuddy.assetDir` 配置的子目录，以相对路径插入
- **代码块语法高亮**：基于 Prism，20+ 种语言（ts/js/python/bash/yaml/rust/go/sql 等），配色自适应 VS Code 明/暗/高对比度主题
- **Arrow 连字**：`->` → `→`，`=>` → `⇒`；代码块内和 IME 组合期间不触发
- **标题一键退回段落**：在标题行开头按 `Backspace` 直接把标题转为段落（不需要 `h2 → h1 → p` 一级级退）

### Frontmatter Properties 面板

YAML frontmatter 在编辑器顶部以类型化面板呈现：

- **类型化字段**：`title`（文本）、`date`（日期选择器）、`tags` / `categories`（chip 输入框）、`author` / `slug`（文本）、`draft`（开关）、`description`（多行文本）
- **添加字段**：下拉菜单可以加一个还没在 YAML 里的已知字段
- **原始 YAML 兜底**：底部可折叠的 `<details>` 里直接改 raw YAML（有自定义字段或注释时用）
- 面板和磁盘在自动保存时双向同步

### 保存与可靠性

- **自动保存**：防抖写盘（~500ms 静默后）
- **Cmd+S**：立即 flush
- **IME 组合保护**：CJK 输入（中文拼音、日语、韩语等）期间挂起自动保存和 BB 触发，直到 composition 提交为止 — 半成品拼音不会被写进磁盘
- **保存时 Markdown 规范化**：bullet 统一为 `-`、紧凑列表、HTML 实体解码、粗体标记周围空白外移、3 个以上连续空行合并为 2 个 — 降低 Git diff 噪声。代码块内容不动
- **外部文件冲突检测**：在 BB Editor 里有未保存改动期间，如果磁盘上文件被修改，顶部黄色横幅让你选 **Reload**（从盘重新载入）或 **Keep my version**（保留当前版本） — 不再静默覆盖
- **View source 按钮**：Frontmatter 面板标题栏的按钮，点一下在侧边 VS Code 编辑器打开原始 `.md`

---

## 📊 文档统计

当前 Markdown 文件的字数会常驻状态栏右侧：

- **统计**：中文字符和英文单词分别计数后相加
- **仅限 Markdown**：非 Markdown 文件下自动隐藏
- **常开**：没有开关 — 打开 `.md` 就显示

## 🎛️ 状态栏 — 配置来源指示器

状态栏另一个 BlogBuddy 小项，显示 `apiKey` 的解析来源：

- `$(key) BB · cfg` — 用的是 `blogbuddy.apiKey` 设置
- `$(key) BB · env` — 用的是 `BLOGBUDDY_API_KEY` 或 `OPENAI_API_KEY` 环境变量
- `$(key) BB · default` — 用的是默认 base URL（`https://api.openai.com/v1`）
- `$(warning) BB: no key` / `$(warning) BB: no model` — 关键配置缺失，黄底警示

Hover 查看每个字段的来源（apiKey / baseURL / model）+ Diagnostics / Select Model / Settings 快捷链接。点击打开完整的 **Show Config Diagnostics** 报告。

---

## 🎛️ 菜单 (Ctrl+Shift+B)

打开交互式菜单：

- **Usage Statistics**（使用统计） — 请求数、token 用量、按 flag / 模型分类；有定价数据时也会估算费用
- **Help Information**（帮助） — 打开本文档

---

## ⚙️ 配置

### 必需配置

只有 **API key** 和 **model** 严格必需。`baseURL` 有合理默认值。

| 配置 | 说明 |
|------|------|
| `blogbuddy.apiKey` | API key。解析顺序：此配置 → `$BLOGBUDDY_API_KEY` → `$OPENAI_API_KEY` |
| `blogbuddy.baseURL` | OpenAI 兼容的 base URL。解析顺序：此配置 → `$BLOGBUDDY_BASE_URL` → `$OPENAI_BASE_URL` → `https://api.openai.com/v1` |
| `blogbuddy.model` | 模型 id（如 `gpt-4o-mini`、`openai/gpt-4o-mini`）。**推荐**：用 **BlogBuddy: Select Model** 命令 |

### 可选配置

| 配置 | 说明 |
|------|------|
| `blogbuddy.assetDir` | BB 编辑器资源上传的相对子目录（如 `assets` 或 `images/uploads`）。基于文档目录解析。留空 = 保存在文档同目录。路径必须位于文档目录内 |

### 命令

命令面板 (`Cmd+Shift+P` / `Ctrl+Shift+P`) 输入 `BlogBuddy:`

| 命令 | 用途 |
|------|------|
| `BlogBuddy: Select Model` | 从 provider 的 `/v1/models` 拉模型列表让你选（或输入自定义 id）。fetch 失败会直接显示具体错误 |
| `BlogBuddy: Show Config Diagnostics` | 打开脱敏报告，显示扩展对 `apiKey` / `baseURL` / `model` 每个字段**实际**读到的值和来源（settings / env / default）。用来排查"我环境变量没读到"这种坑 |
| `BlogBuddy: Show Menu` | 使用统计和帮助 |
| `BlogBuddy: Hi BB` | 在当前光标 / 选区上执行 BB 命令（和 `Cmd+B Cmd+B` 等价） |
| `BlogBuddy: Open BB Editor` | 用 BB 编辑器打开当前 `.md` |

### macOS 环境变量坑

macOS 上从 Dock / Spotlight 启动的 App 不会继承 shell 环境变量。如果你把 `OPENAI_API_KEY` 写在 `~/.zshrc` 但 BlogBuddy 读不到：

1. **最简单的办法**：从终端启动 VS Code：

   ```bash
   source ~/.zshrc && code .
   ```

2. **持久化办法**：注入到 launchd 会话：

   ```bash
   launchctl setenv OPENAI_API_KEY 'sk-...'
   ```

   然后 ⌘Q 彻底退出再重启 VS Code。这个设置重启电脑后失效；要永久持久化就建一个 LaunchAgent plist。

跑一下 **BlogBuddy: Show Config Diagnostics** 就能确认扩展实际读到什么。

---

## 💡 专家提示

### 最佳实践

1. **利用智能范围检测**：光标位置即范围
   - BB 标签和内容在同一行 → 只处理该行
   - 光标在带 BB 标签的段落里任意位置 → 处理该段落
   - BB 标签单独夹在上下空行之间 → 全文（前提是该命令支持全文模式）
2. **指令要具体**：标签消息里写清楚你想要什么，输出质量会明显提高
3. **审查 AI 输出**：落地前务必审 — AI 会出错
4. **组合使用**：扩写 → 润色 → 翻译 是常见链路

### 命令组合示例

**行级**（标签 + 内容同一行）：

```markdown
Machine learning is a subset of AI. <bb-expd:add practical examples>
```

**段落**：

```markdown
Your initial paragraph here.
<bb-expd:add technical details>
```

**全文**（标签夹在上下空行之间）：

```markdown
Some content here...

<bb-impv:improve grammar and readability throughout the entire document>

More content here...
```

---

## 🔧 快捷键与命令（速查）

| 操作 | 快捷键 | 命令 |
|------|--------|------|
| 执行 BB 命令 | `Cmd+B Cmd+B` (Mac)<br>`Ctrl+B Ctrl+B` (Win/Linux) | `blogbuddy.bb` |
| 打开主菜单 | `Cmd+Shift+B` (Mac)<br>`Ctrl+Shift+B` (Win/Linux) | `blogbuddy.menu` |
| 打开 BB 编辑器 | `Cmd+B` (Mac)<br>`Ctrl+B` (Win/Linux) — 文件管理器选中 `.md` 时 | `blogbuddy.openEditor` |
| 选择模型 | 命令面板 | `blogbuddy.selectModel` |
| 显示配置诊断 | 命令面板 | `blogbuddy.showDiagnostics` |

---

## ❓ 故障排除

### "API Key not set" 警告

- 检查 `blogbuddy.apiKey` 设置，**或** 导出 `BLOGBUDDY_API_KEY` / `OPENAI_API_KEY`
- 跑 **BlogBuddy: Show Config Diagnostics** 看扩展**实际**读到什么
- macOS 上如果设了环境变量但没生效，见上面的"macOS 环境变量坑"

### BlogBuddy: Select Model 失败

- 看报错原文，常见情况：
  - `401 Unauthorized`：API key 错了，或 key 对 provider 没足够权限
  - `404 / ENOTFOUND`：base URL 错了（比如漏了 `/v1` 路径）
  - `fetch failed` / `ECONNREFUSED`：网络 / 代理问题
  - 证书错误：企业代理 / TLS 拦截
- 错误对话框里的 "Enter Manually" 按钮允许在列表拉不到时手动输入模型 id

### "Translation requires target language"

- 标签里加上目标语言，比如 `<bb-tslt:Spanish>` 或 `<bb-tslt:日本語>`

### Mermaid 代码看起来有问题

- BB 会校验输出以合法图表前缀开头（如 `flowchart`、`sequenceDiagram`）。如果 AI 生成的是无法识别的内容，换更具体的指令或更强的模型再试

### 生成的内容跑题

- 标签消息里写更具体的指令
- BB 会读完整文档做上下文；如果文档太大上下文可能被截断，可以手动选中一部分文本缩小范围

### 获取支持

- VS Code Output 面板看扩展日志
- GitHub 上 [提 issue](https://github.com/FulcrumStd/blogbuddy/issues)，顺便附上诊断报告的输出

---

## 🔄 版本历史

完整的分版本变更清单见 [CHANGELOG](../CHANGELOG.md)。近期 release 亮点：

- **0.0.12** — 配置精简（单模型、永远流式、字数常开）；apiKey 和 baseURL 的环境变量回退；`BlogBuddy: Select Model` 和 `BlogBuddy: Show Config Diagnostics` 命令；状态栏配置来源指示器；Mermaid 输出统一为围栏代码块
- **0.0.11** — BB 编辑器大升级：CJK IME 保护、Prism 语法高亮、外部文件冲突检测、frontmatter 类型化面板、arrow 连字、保存时 Markdown 规范化、View Source 按钮
- **0.0.10** — BB 编辑器引入 frontmatter 预览与编辑面板

---

*为高效写作流程倾注 ❤️*
