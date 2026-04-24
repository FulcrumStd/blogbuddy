# BlogBuddy - 你的 AI 驱动的博客写作助手

<div align="center">

<img src="images/logo.png" alt="BlogBuddy 徽标" width="200">

**BlogBuddy** 通过 AI 驱动的写作助手让 Markdown 变得神奇！

[![版本](https://img.shields.io/badge/version-0.0.12-FFD900.svg)](https://github.com/FulcrumStd/blogbuddy)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC.svg)](https://marketplace.visualstudio.com/items?itemName=blogbuddy.blogbuddy)
[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)

</div>

## ⚠️ 重要提示

> **🚧 开发状态**：本项目目前处于积极开发中。功能可能存在缺陷，且在未来更新中可能发生变化。请在生产环境中谨慎使用。

> **🧪 实验性功能**：`bb` 命令（AI Agent 模式）目前正在开发中，属于实验阶段。此功能可能无法按预期工作，并可能经历重大更改。

## ✨ 什么是 BlogBuddy？

BlogBuddy (BB) 是一款为 VS Code 设计的扩展，旨在在不打断创作流程的前提下增强你的博客写作工作流。你无需切换上下文或打开外部工具，只需在 Markdown 内容中直接插入 BB 命令标签，并通过快捷键触发它们。就是这么简单！

## 🚀 主要功能

### 智能命令标签

在博客文章中的任意位置使用直观的命令标签（所有标签均支持 `<bb-xxx:自定义指令>` 格式）：

- `<bb:任务描述>` - 直接 AI agent 模式，给 BB 下达任何任务
- `<bb-expd:扩展要求>` - 扩展并详述周围文本内容
- `<bb-impv:改进重点>` - 润色文本质量（内联用于局部文本，独立用于整个文档）
- `<bb-tslt:目标语言>` - 翻译内容（必须指定目标语言）
- `<bb-tldr:摘要风格>` - 生成 TL;DR 摘要
- `<bb-mmd:图表描述>` - 生成 Mermaid 图表（围栏代码块）
- `<bb-kwd:关键词重点>` - 提取关键词
- `<bb-tag>` - 添加 BlogBuddy 署名徽章

### 无缝工作流集成

- **非侵入式**：命令直接嵌入内容中
- **键盘驱动**：通过简单的按键组合激活
- **上下文感知**：AI 理解你完整的文档上下文
- **默认流式**：输出跟随 AI 生成逐 token 实时显示
- **即时结果**：命令执行并在原位替换内容

### BB 编辑器（所见即所得）

内置基于 [Milkdown](https://milkdown.dev) 的富文本 Markdown 编辑器，专为沉浸式写作体验设计：

- **富文本编辑**：所见即所得，实时预览，无需分屏
- **GFM 支持**：表格、删除线、任务列表、自动链接
- **内置 BB 命令**：通过 `/` 斜杠菜单或 `Cmd+B Cmd+B` 触发任意 BB 命令
- **AI 流式输出**：AI 处理结果以内联块的形式实时显示
- **代码块语法高亮**：围栏代码块基于 Prism 显示彩色 token（20+ 种语言，配色自适应 VS Code 明暗主题）
- **Frontmatter 类型化面板**：YAML 字段（`title`、`date`、`tags`、`categories`、`author`、`slug`、`draft`、`description`）渲染为类型化控件 — 日期选择器、chip 输入框、开关等。原始 YAML 仍作为可折叠兜底保留
- **IME 友好**：CJK 输入法组合事件受保护，半成品拼音不会触发自动保存或 BB 命令
- **Arrow 连字**：`->` 自动转 `→`，`=>` 转 `⇒`；代码块内和 IME 组合期间不触发
- **保存时 Markdown 规范化**：bullet 统一为 `-`、紧凑列表、HTML 实体解码、多余空行合并 — 降低 Git diff 噪声
- **外部文件冲突检测**：编辑期间文件被外部修改时，显示黄色横幅让你选择 Reload 或 Keep my version，不再静默覆盖
- **View source 按钮**：随时在侧边 VS Code 编辑器中打开原始 `.md`
- **图片与附件粘贴**：粘贴或拖入 — 文件保存到文档目录（或通过 `blogbuddy.assetDir` 配置的子目录），以相对路径插入
- **自动保存**：防抖自动保存；`Cmd+S` 可立即 flush
- **主题同步**：编辑器主题跟随 VS Code 配色方案

打开 BB 编辑器：

- 在文件管理器中右键点击 `.md` 文件 → **BlogBuddy: Open BB Editor**
- 或在文件管理器中选中 `.md` 后按 `Cmd+B` (Mac) / `Ctrl+B` (Win/Linux)

### 文档统计

当前 Markdown 文件的字数会一直显示在 VS Code 状态栏：

- **智能计数**：中文字符和英文单词分别计数
- **状态栏显示**：右侧一个不显眼的小项
- **仅限 Markdown**：非 Markdown 文件下自动隐藏

### 配置来源指示器

状态栏还有一个 BlogBuddy 小项，显示你当前 `apiKey` 的解析来源（`cfg` / `env` / `default`）。Hover 看每个字段的来源，点击打开完整诊断。

## 📖 如何使用

### 快速开始

1. 从 VS Code Marketplace 安装 BlogBuddy
2. 设置 API key — 两种方式之一：
   - 在 VS Code 设置里配置 `blogbuddy.apiKey`，**或**
   - 以环境变量形式 `export BLOGBUDDY_API_KEY` / `OPENAI_API_KEY`
3. 如果用的不是 OpenAI（比如 OpenRouter / DeepSeek / 自己的代理），设置 `blogbuddy.baseURL`。留空会依次回退到 `BLOGBUDDY_BASE_URL` / `OPENAI_BASE_URL` 环境变量，再回退到 `https://api.openai.com/v1`
4. 在命令面板运行 **BlogBuddy: Select Model** — 命令会从 provider 的 `/v1/models` 拉模型列表让你选（列表不全时也可输入自定义 id）
5. 开始写作，在需要 AI 协助的地方插入 BB 命令

### 基本用法

1. **在文本中插入命令标签**：

   ```markdown
   Here's a brief overview of machine learning.
   <bb-expd:focus on practical applications>
   ```

2. **把光标停在包含标签的段落中**（或手动选中一段精确控制范围）

3. **按激活键**：`Cmd+B Cmd+B` (Mac) 或 `Ctrl+B Ctrl+B` (Win/Linux)

4. **见证 BB 魔法** — 命令标签和周围文本会被 AI 生成的内容替换（流式实时显示）

### 菜单访问

使用 `Cmd+Shift+B` (Mac) / `Ctrl+Shift+B` (Win/Linux) 打开 BB 菜单（使用统计、帮助等）。

### 📚 详细文档

完整功能说明、示例和进阶技巧，请看：
**➡️ [完整用户指南](docs/help_中文.md)**

## ⌨️ 键盘快捷键

| 快捷键 | 操作 |
|----------|--------|
| `Cmd+B Cmd+B` (Mac)<br>`Ctrl+B Ctrl+B` (Win/Linux) | 在当前文本块/所选文本上执行 BB 命令 |
| `Cmd+Shift+B` (Mac)<br>`Ctrl+Shift+B` (Win/Linux) | 打开 BB 菜单 |
| `Cmd+B` (Mac)<br>`Ctrl+B` (Win/Linux) | 在文件管理器选中 `.md` 时打开 BB Editor |

BB Editor 内：

| 快捷键 | 操作 |
|----------|--------|
| `/` | 打开斜杠菜单（BB 命令 + 块类型） |
| `Cmd+B Cmd+B` | 内联触发 `<bb-*>` 标签 |
| `Cmd+S` | 立即保存 |
| `Backspace`（位于标题行开头） | 把标题转回普通段落 |

## ⚙️ 配置

BlogBuddy 只需要一个 API key 和一个模型；其他配置都有合理默认值。

### Settings

| Key | 说明 |
|-----|------|
| `blogbuddy.apiKey` | API key。留空时依次回退到 `BLOGBUDDY_API_KEY` → `OPENAI_API_KEY` 环境变量 |
| `blogbuddy.baseURL` | OpenAI 兼容的 base URL。留空时依次回退到 `BLOGBUDDY_BASE_URL` → `OPENAI_BASE_URL` 环境变量，再回退到 `https://api.openai.com/v1` |
| `blogbuddy.model` | 模型 id。推荐：跑 **BlogBuddy: Select Model** 从 provider 列表里挑 |
| `blogbuddy.assetDir` | BB Editor 资源上传的相对子目录（如 `assets`）。留空 = 保存在文档同目录 |

### 命令

| 命令 | 用途 |
|------|------|
| `BlogBuddy: Select Model` | 从配置的 base URL 拉 `/v1/models` 列表弹选择器；列表为空或没想要的还可以 "Enter custom model…" 手动输入 |
| `BlogBuddy: Show Config Diagnostics` | 打开一份脱敏报告，显示扩展**实际**读到的每个字段来源（settings / env / default） — 用来排查"我设了环境变量但没生效"这种 macOS 坑 |
| `BlogBuddy: Show Menu` | 使用统计、帮助等 |
| `BlogBuddy: Hi BB` | 在当前文本上执行 BB 命令 |
| `BlogBuddy: Open BB Editor` | 用 BB Editor 打开当前 `.md` |

### macOS 环境变量坑

如果你把 `OPENAI_API_KEY` 写在 `~/.zshrc` 里但从 Dock 启动的 VS Code 读不到，这是因为 Dock 启动的 GUI 应用不会读 shell 配置。两个办法：

- **从终端启动 VS Code**：`source ~/.zshrc && code .`
- 或者在终端跑 `launchctl setenv OPENAI_API_KEY 'sk-...'`，然后 ⌘Q 彻底退出再从 Dock 重启

跑一下 **BlogBuddy: Show Config Diagnostics** 就能确认扩展实际读到什么。

## 🎯 适合人群

- **博客写作者** 希望在不离开编辑器的情况下获得 AI 帮助
- **内容创作者** 希望增强写作工作流
- **技术作者** 需要生成图表和扩展内容
- **多语言博主** 需要翻译辅助
- **任何人** 重视无缝、键盘驱动的高效工作方式

## 🐛 问题与反馈

发现 bug 或有功能建议？请在 GitHub 仓库 [提交 issue](https://github.com/FulcrumStd/blogbuddy/issues)。

---

**祝使用 BB 写博客愉快！ 🎉**
