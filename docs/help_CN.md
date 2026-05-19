# BlogBuddy — 完整用户指南

[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)

[English version](help.md) · [README](README_CN.md) · [更新日志](../CHANGELOG.md)

BlogBuddy 是一款 VS Code 扩展，让 AI"动词"直接活在你的 Markdown 里。在文本中嵌入一个标签，按一组快捷键，流式 AI 输出原地替换标签。本文档是参考手册——配置、每个命令、BB 编辑器、AI 阅读视图、常见问题。

---

## 快速开始

1. 从 VS Code Marketplace 安装 **BlogBuddy**。
2. 配置凭证，两种方式之一：
   - 在 VS Code 设置里填 `blogbuddy.apiKey`，**或**
   - 导出 `BLOGBUDDY_API_KEY`（再回退到 `OPENAI_API_KEY`）。
3. 在命令面板跑 **BlogBuddy: Select Model**——拉 provider 的 `/v1/models` 列表，选一个或输入自定义 id。
4. 打开任意 `.md` 文件，插入标签，按 `Cmd+B Cmd+B` (Mac) / `Ctrl+B Ctrl+B` (Win/Linux)。

字数统计会一直显示在 Markdown 文件的状态栏——没有开关。

---

## 三个入口

| 入口 | 触发方式 | 适合 |
|---|---|---|
| **内联标签** | 文本里写 `<bb-*>` + `Cmd+B Cmd+B` | 快路径——AI 嵌在正文里，光标都不用挪 |
| **BB 编辑器** | 在 Explorer 选中 `.md` 后按 `Cmd+B` | WYSIWYG 编辑，含 frontmatter 类型化面板、斜杠菜单、流式 AI 块 |
| **命令面板** | `Cmd+Shift+P` → `BlogBuddy:` | 其他所有功能——模型选择、诊断、使用统计、模板等 |

---

## 内联 BB 命令

在文本里嵌入指令标签，按快捷键（`Cmd+B Cmd+B` Mac / `Ctrl+B Ctrl+B` Win/Linux）触发。

### 标签语法

```
<command:可选指令>
```

冒号后的可选指令用来 refine 模型的简报。示例：`<bb-expd:补充具体例子>`、`<bb-impv:精简表达>`、`<bb-tslt:日本語>`。

### 智能范围检测

BB 根据光标/选区自动判断处理范围：

- **手动选中** → 仅处理选中文本。
- **同行有正文** → 标签和正文共享一行，仅处理该行。
- **段落（文本块）** → 标签位于一个块内，处理整个块（空行分隔的文本块）。
- **全文** → 标签独占一个块（上下空行隔开）**且**该命令支持全文模式（`bb-impv`、`bb-tslt`、`bb`）。输出写到新文件。

### 八条内联命令

#### `<bb-expd:重点>` — 扩写

在保留语气和结构的前提下扩展已有内容。BB 读取整篇文档上下文，让补充内容自然衔接。

```markdown
机器学习正在改变软件开发。
<bb-expd:扩写成一篇适合技术博客的版本>
```

#### `<bb-impv:风格>` — 润色

打磨表达、语法和节奏。

- **块模式**（标签与正文共存于一段）—— 原地重写该段。
- **全文模式**（标签独立成块）—— 把整个文档重写成新文件 `*_improved.md`。

```markdown
这段话有些重复内容，反复说着同一件事。
<bb-impv:精简表达，去除冗余>
```

#### `<bb-tslt:目标语言>` — 翻译

翻译整篇文档。始终为全文模式；必须指定目标语言。

```markdown
<bb-tslt:中文>
<bb-tslt:Japanese>
<bb-tslt:Français>
```

输出一个带语言后缀的新文件（如 `myblog_日本語.md`），并在原文档插入一个 Markdown 链接。Markdown 结构和围栏代码块原样保留。

#### `<bb-mmd:图表描述>` — Mermaid

根据描述生成 Mermaid 图表。BB 自动选择图表类型（flowchart / sequence / class / state / ER / gantt / pie），并验证输出以已知前缀开头。

```markdown
用户注册流程：
1. 用户输入邮箱和密码
2. 系统校验凭证
3. 校验通过后创建账户
4. 发送确认邮件
<bb-mmd:画成 flowchart>
```

输出：一个 ` ```mermaid ` 围栏代码块。VS Code Markdown 预览原生渲染。

#### `<bb-kwd:重点>` — 关键词

从文档中提取 8–12 个 SEO 友好的关键词。

```markdown
<bb-kwd:聚焦技术术语>
<bb-kwd:>
```

#### `<bb-tldr:摘要风格>` — TL;DR

行内生成简洁的"懒人摘要"。

```markdown
<bb-tldr:聚焦可执行结论>
<bb-tldr:>
```

#### `<bb-tag>` — 署名徽章

插入 BlogBuddy 署名徽章：

```
[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)
```

#### `<bb:任意指令>` — 自由模式

最灵活的兜底——把任意指令交给 BB。块模式重写当前段；全文模式写到新文件 `*_processed.md`。

> **注意。** 自由模式是最耗 token 的命令。上面那些专用标签能解决就用专用的——它们使用更紧凑的 prompt，输出也更可预测。

```markdown
- 特性 1：描述
- 特性 2：描述
<bb:把这个列表改成对比表格>
```

---

## AI 阅读视图

`<bb-render-*>` 系列触发 AI 重新诠释：它不会替换源文件里的文本，而是生成一份完整的 HTML "阅读 artifact" 渲染在侧边面板。你的 `.md` 永远不会被改动。

### 四种预设

| 标签 | 给模型的简报 |
|---|---|
| `<bb-render-blog:>` | **Blog View** —— 精致博客文，黏性 TOC、callout、语法高亮、舒适行宽 |
| `<bb-render-skim:>` | **Skim Mode** —— 顶端 TL;DR，密集的视觉结构，`<details>` 折叠可跳过的细节 |
| `<bb-render-expl:>` | **Explainer** —— 教学 artifact，SVG 图示、代码注释、"why this matters" 侧栏 |
| `<bb-render:你的 prompt>` | **Custom** —— 你的 prompt 完全主导创作方向（覆盖预设风格） |

所有预设都接受冒号后的 refinement：

```markdown
<bb-render-blog:让 TOC 黏性，加打印样式表>
```

### 触发

把光标停在标签任意位置，按 `Cmd+B Cmd+B` (macOS) / `Ctrl+B Ctrl+B` (Windows/Linux)。标签会**从你的源文件中删除**，右侧打开 BB Reader 面板。

在 BB 编辑器里，`/` 斜杠菜单有 **Render** 分组，四种预设都已预填——选一个，在 `:` 和 `>` 之间填 refinement，触发。

### Reader 面板结构

- **顶部条** —— 阶段指示器（`Generating…` / `Done ✓`）、实时 token 计数、当前预设、`.bbreader.md` 启用时的标记
- **Prompt 输入框** —— 行内编辑 refinement，回车或点 **Regenerate** 重跑
- **流式预览** —— HTML 在沙盒 iframe 里逐步渲染；完成时用规范完整文档替换流式 buffer
- **源文件改动横幅** —— render 之后改 `.md`，面板顶部出现一键 Regenerate（自动重渲是故意不做的）
- **BB 徽章脚注** —— 每次生成（预览和导出）底部都有一枚小徽章链回仓库

### 导出

点 **Export** 在 `.md` 旁边写一份 self-contained `.html`（默认文件名 `<source>.reader.html`）。默认会从磁盘读取本地路径图片并 base64 内嵌，单文件可携带。把 `blogbuddy.reader.inlineAssets` 设为 `false` 可保留相对路径（适合 assets 目录随 HTML 一起部署到站点）。

### `.bbreader.md` 样式参考

在**工作区根**放一份 `.bbreader.md`，让多次 render 保持视觉一致。每次 render 都会自动读入，作为权威样式指南喂给 AI（layout、字体、配色、组件）。Reader 顶部条会显示 `· .bbreader.md`。

跑 **BlogBuddy: Create .bbreader.md Template** 生成一份起步模板，分五节：

- **Visual style** —— typography、body width、配色、标题、代码块、callout、链接
- **Document structure** —— TOC、署名、日期格式、预计阅读时间
- **Components** —— AI 可使用的特殊元素
- **Example HTML** —— 直接粘贴一段你现有博客的 HTML 作参考
- **Things to avoid**

有意见的填，没意见的留空。随时可改可重渲——下一次 render 立即生效。该文件上限约 10,000 字符（超出部分截断并附 `[... truncated]` 标记）。

### 成本守门

预估输入 token 超过约 25,000（约 100KB Markdown + 样式参考）时，弹模态确认，避免在大文件上误花钱。

### 安全模型

Reader iframe 通过 Blob URL 加载，会执行 AI 生成的内联脚本——这样 AI 写的折叠、tab 切换、简易滑块等交互都能跑起来。父 webview 的 CSP 设了 `connect-src 'none'`，注入的脚本无法回家。安全边界取决于你信任 AI provider 和你渲染的源内容。

---

## BB 编辑器

扩展内置的 WYSIWYG Markdown 编辑器。从 Explorer 右键菜单（`.md` 上右键 → **BlogBuddy: Open BB Editor**）或选中后 `Cmd+B` 打开。读写均为纯 Markdown——没有私有格式。

### 核心编辑

- **WYSIWYG + 完整 GFM** —— 表格、删除线、任务列表、自动链接、引用块、代码块
- **斜杠菜单（`/`）** —— 行内插入块类型或 BB 命令；方向键到边界会 clamp（不再循环）
- **内联 `Cmd+B Cmd+B`** —— 不离开编辑器就触发任意 `<bb-*>` 标签
- **流式 AI 块** —— AI 输出以一个 ProseMirror 类型节点的形式内联出现，逐 token
- **粘贴落盘** —— 粘贴或拖入文件，保存到文档目录或 `blogbuddy.assetDir`，以相对路径插入
- **Prism 语法高亮** —— 20+ 种语言（TypeScript、JavaScript、Python、Bash、YAML、Rust、Go、SQL 等）；配色跟随 VS Code 明/暗/高对比度主题
- **Arrow 连字** —— `->` → `→`、`=>` → `⇒`；代码块和 IME 组合期间不触发
- **标题转段落** —— 标题行开头按 `Backspace` 直接转回段落（不再 `h2 → h1 → p` 一级一级降）

### Frontmatter 类型化面板

YAML frontmatter 在编辑器顶部以类型化面板呈现：

- **类型化字段** —— `title`（文本）、`date`（日期选择器）、`tags` / `categories`（chip 输入）、`author` / `slug`（文本）、`draft`（开关）、`description`（textarea）
- **Add field** —— 下拉添加 YAML 中尚未存在的已知字段
- **原始 YAML 兜底** —— 底部可折叠 `<details>` 直接编辑（适合自定义字段或注释）
- 改动随自动保存与正文一起落盘

### 保存与可靠性

- **自动保存** —— 防抖写入（静默约 500ms 后）
- **`Cmd+S`** —— 立即 flush
- **IME 组合保护** —— CJK 输入（中文/日文/韩文拼音等）组合期间暂停自动保存和 BB 触发；半成品拼音不会泄露进保存
- **保存时紧凑规范化** —— bullet 统一为 `-`、紧凑列表、HTML 实体解码、加粗标记空白外移、连续 3 行以上空行合并为 2 行；围栏代码块内容原样保留
- **外部改动检测** —— 你有未保存编辑时文件被外部改动，提示 **Reload** 或 **Keep my version**（不再静默覆盖）
- **View source** —— Properties 面板头有按钮，可随时在侧边 VS Code 编辑器中打开原始 `.md`

---

## 状态栏

Markdown 文件打开时右侧出现两个小项。

### 字数统计

中文字符和英文单词分别计数后求和。仅 Markdown，其他文件类型自动隐藏，没有开关。

### 配置来源指示器

显示 `apiKey` 当前的解析来源：

| 显示 | 含义 |
|---|---|
| `$(key) BB · cfg` | 使用设置里的 `blogbuddy.apiKey` |
| `$(key) BB · env` | 使用 `BLOGBUDDY_API_KEY` 或 `OPENAI_API_KEY` 环境变量 |
| `$(key) BB · default` | 使用默认 base URL（`https://api.openai.com/v1`） |
| `$(warning) BB: no key` / `BB: no model` | 必填配置缺失（黄色） |

Hover 看每字段的来源表（apiKey、baseURL、model）和快速链接（Diagnostics / Select Model / Settings）。点击打开完整的 **Show Config Diagnostics** 报告。

---

## 使用统计

在命令面板跑 **BlogBuddy: Show Usage Statistics** 打开一份 Markdown 报告，含请求次数、token 用量、按 flag / 按模型分类的明细，以及（有定价数据时）成本估算。

配套命令：

- **BlogBuddy: Reset Usage Statistics** —— 清空计数器（带确认）
- **BlogBuddy: Refresh Pricing Data** —— 重新从 provider 拉定价

---

## 配置

### 必填

只有 **API key** 和 **model** 严格必填。`baseURL` 有合理默认值。

| Setting | 说明 |
|---|---|
| `blogbuddy.apiKey` | API key。解析顺序：本设置 → `$BLOGBUDDY_API_KEY` → `$OPENAI_API_KEY` |
| `blogbuddy.baseURL` | OpenAI 兼容 base URL。解析顺序：本设置 → `$BLOGBUDDY_BASE_URL` → `$OPENAI_BASE_URL` → `https://api.openai.com/v1` |
| `blogbuddy.model` | 模型 id（如 `gpt-4o-mini`，OpenRouter 上的 `openai/gpt-4o-mini`）。**推荐**：用 **BlogBuddy: Select Model** |

### 可选

| Setting | 说明 |
|---|---|
| `blogbuddy.assetDir` | BB 编辑器资源上传的相对子目录（如 `assets`、`images/uploads`）。从文档目录起算，必须留在文档目录内。留空 = 保存在文档同目录 |
| `blogbuddy.reader.inlineAssets` | BB Reader 导出时是否把本地图片 base64 内嵌成单文件 HTML。默认 `true`；设 `false` 保留相对路径 |

### 命令

打开命令面板（`Cmd+Shift+P` / `Ctrl+Shift+P`），输入 `BlogBuddy:`。

| 命令 | 用途 |
|---|---|
| `BlogBuddy: Hi BB` | 在当前光标/选区上执行 BB 命令（等同于快捷键） |
| `BlogBuddy: Open BB Editor` | 用 BB 编辑器打开当前 `.md` |
| `BlogBuddy: Select Model` | 拉 `/v1/models` 列表，选一个或输入自定义 id。鉴权/网络错误会直接呈现，附 Retry / Enter Manually |
| `BlogBuddy: Show Config Diagnostics` | 脱敏报告——扩展实际读到每个字段的值。用来排查"我设了环境变量但没生效" |
| `BlogBuddy: Show Usage Statistics` | Markdown 报告——token 用量、请求次数、按 flag / 按模型分类 |
| `BlogBuddy: Reset Usage Statistics` | 清空所有计数器（带确认） |
| `BlogBuddy: Refresh Pricing Data` | 重新从 provider 拉定价数据 |
| `BlogBuddy: Create .bbreader.md Template` | 在工作区根创建 AI Reader 样式参考模板 |

### macOS 环境变量坑

macOS 上从 Dock 或 Spotlight 启动的 App 不会继承 shell 环境变量。如果你把 `OPENAI_API_KEY` 写在 `~/.zshrc` 里但 BlogBuddy 读不到：

**简单办法** —— 从 Terminal 启动 VS Code，先 `source ~/.zshrc`：

```bash
code .
```

**持久办法** —— 注入到 launchd session：

```bash
launchctl setenv OPENAI_API_KEY 'sk-...'
```

然后 ⌘Q 彻底退出再重启 VS Code。这种方式可持续到下次重启；要永久解决可建一个 LaunchAgent plist。

跑 **BlogBuddy: Show Config Diagnostics** 看扩展实际读到了什么。

---

## 进阶技巧

### 用光标位置选择范围

最有用的一个习惯。仅凭光标位置就能告诉 BB 处理什么：

- 标签与正文同行 → 处理**那一行**
- 光标停在含 BB 标签的段里 → 处理**整段**
- BB 标签独占一块（上下空行隔开，支持全文模式的命令）→ 处理**整个文档**

### 把指令写清楚

冒号后面的指令对输出的影响比命令本身更大。`<bb-expd:>` 还行；`<bb-expd:加一个具体的线上调试例子>` 更好。

### 组合使用

常见写作链路：`bb-expd` → `bb-impv` → `bb-tslt`。

### 行级精修

要做手术刀级修改，把标签和需要改的文字写在同一行：

```markdown
机器学习是 AI 的一个子集。<bb-expd:加几个实用例子>
```

### 全文操作

要做全文级重写或翻译，把标签上下空行隔开：

```markdown
前面内容...

<bb-impv:全文改进语法和可读性>

后面内容...
```

---

## 快捷键与命令（速查）

| 操作 | 快捷键 | 命令 id |
|---|---|---|
| 执行 BB 命令 | `Cmd+B Cmd+B` (Mac) / `Ctrl+B Ctrl+B` (Win/Linux) | `blogbuddy.bb` |
| 打开 BB 编辑器 | `Cmd+B` (Mac) / `Ctrl+B` (Win/Linux) —— Explorer 选中 `.md` | `blogbuddy.openEditor` |
| 选择模型 | 命令面板 | `blogbuddy.selectModel` |
| 显示诊断 | 命令面板 | `blogbuddy.showDiagnostics` |
| 显示使用统计 | 命令面板 | `blogbuddy.showUsageStats` |
| 创建 .bbreader.md 模板 | 命令面板 | `blogbuddy.createReaderTemplate` |

---

## 常见问题排查

### "API Key not set"

- 检查 `blogbuddy.apiKey`，或导出 `BLOGBUDDY_API_KEY` / `OPENAI_API_KEY`。
- 跑 **BlogBuddy: Show Config Diagnostics** 看扩展实际解析到了什么。
- macOS 上设了环境变量但没生效，看上面那节"环境变量坑"。

### "Select Model" 失败

看错误信息，常见情况：

- `401 Unauthorized` —— API key 错或权限不足。
- `404` / `ENOTFOUND` —— base URL 错（比如缺 `/v1` 路径）。
- `fetch failed` / `ECONNREFUSED` —— 网络/代理问题。
- 证书错误 —— 企业代理 / TLS 拦截。

错误弹窗里有 **Enter Manually** 按钮，拉列表失败时也能手动输入模型 id。

### 翻译提示需要目标语言

冒号后加语言：`<bb-tslt:Spanish>` 或 `<bb-tslt:日本語>`。

### Mermaid 输出看起来不对

BB 会校验输出是否以已知图表前缀开头（`flowchart`、`sequenceDiagram` 等）。如果 AI 生成了不可用的内容，试试更具体的指令或换个模型。

### AI 输出跑题

- 把冒号后的指令写得更紧凑。
- BB 读取整篇文档上下文；文档很大时上下文可能被截断——手动选一小段精确处理。

### 日志与支持

- 看 VS Code Output 面板的扩展日志。
- 带上诊断输出 [提交 issue](https://github.com/FulcrumStd/blogbuddy/issues)。

---

## 版本历史

完整的版本变更见 [CHANGELOG](../CHANGELOG.md)。最近几个版本亮点：

- **0.0.13** —— **AI 阅读视图**（`<bb-render-*>` 系列、侧边面板 HTML 渲染、流式预览、单文件导出、`.bbreader.md` 样式参考）。BB Menu 已移除，所有功能改由命令面板统一暴露；统计/帮助直接打开内容，没有中间通知步骤；斜杠菜单方向键在边界 clamp，不再循环。
- **0.0.12** —— 配置简化（统一 `model` 设置、始终流式、始终显示字数）。API key 和 base URL 支持环境变量回退。新增 **Select Model** 和 **Show Config Diagnostics** 命令。状态栏新增配置来源指示器。Mermaid 输出始终为围栏代码块。
- **0.0.11** —— BB 编辑器打磨：CJK 输入 IME 保护、Prism 语法高亮、外部文件冲突检测、frontmatter 类型化面板、Arrow 连字、紧凑 Markdown 规范化、View Source 按钮。
- **0.0.10** —— BB 编辑器新增 frontmatter 预览和编辑面板。

---

*为在 Markdown 里写作的人精心打造。*
