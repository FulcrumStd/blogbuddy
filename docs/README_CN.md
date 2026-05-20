<div align="center">

<img src="../images/logo.png" alt="BlogBuddy" width="180">

# BlogBuddy

**让 AI 指令活在你的 Markdown 里。**
写一个标签，敲一组快捷键，看它原地解析。

[![版本](https://img.shields.io/badge/version-0.0.13-FFD900.svg)](https://github.com/FulcrumStd/blogbuddy)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC.svg)](https://marketplace.visualstudio.com/items?itemName=FulcrumStudio.blogbuddy)
[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)

[English README](../README.md) · [完整用户指南](help_CN.md) · [更新日志](../CHANGELOG.md)

</div>

---

## 一句话说清楚

你在写 Markdown，需要 AI 帮忙——扩写、润色、翻译、摘要、画图。市面上的工具大多把你拽出去开个对话窗口，然后再回来，然后再出去。

**BlogBuddy 把这些"动词"直接搬进你的正文。** 在段落里写下 `<bb-expd:补充具体例子>` 这样的标签，按 `Cmd+B Cmd+B`，标签连同周围的文本块会被流式 AI 输出原地替换——光标都不用挪。

这就是核心想法。剩下的事，是把它做扎实。

---

## 一屏看懂

```markdown
机器学习正在改变软件的写法。
<bb-expd:面向资深工程师读者扩写>
```

把光标停在这段，按 `Cmd+B Cmd+B`。标签消失，段落扩展，文字逐 token 流入。处理范围由光标位置自动推断——当前行、整段、或整个文档。

---

## BB 标签词汇表

八条内联命令 + 四个 Reader 预设。所有标签都接受冒号后的可选指令，例如 `<bb-foo:换个角度说说 X>`。

| 标签 | 作用 |
|---|---|
| `<bb:任意指令>` | 自由模式。把任务直接交给 BB，它在当前范围内处理。最灵活的兜底 |
| `<bb-expd:重点>` | 在当前文风下扩写、补例 |
| `<bb-impv:风格要求>` | 润色。内联模式重写当前块；标签独立成块时重写整篇为 `*_improved.md` |
| `<bb-tslt:目标语言>` | 翻译整篇。输出 `myblog_日本語.md` 并附链接 |
| `<bb-tldr:摘要风格>` | 内联生成 TL;DR |
| `<bb-mmd:图表类型>` | 生成 ` ```mermaid ` 围栏代码块。自动挑选 flowchart / sequence / class / state / ER / gantt / pie |
| `<bb-kwd:重点>` | 提取 8–12 个 SEO 友好的关键词 |
| `<bb-tag>` | 插入一枚 "created with BB" 署名徽章 |
| `<bb-render-blog:>` `<bb-render-skim:>` `<bb-render-expl:>` `<bb-render:prompt>` | AI 阅读视图——下面详述 |

> **始终流式。** 输出随模型生成实时显示。**上下文感知。** BB 读取整篇文档，不只是选中的几行。**智能范围。** 仅凭光标位置就能判断是改一行、改一段、还是改全文。

---

## BB 编辑器 —— 一个尊重 Markdown 的 WYSIWYG

基于 [Milkdown](https://milkdown.dev) 的内置富文本 `.md` 编辑器。从文件管理器（在 `.md` 上按 `Cmd+B`）或编辑器标题栏打开。落盘是干净的 Markdown，规范化方式可预测。

- **WYSIWYG + 完整 GFM** —— 表格、删除线、任务列表、自动链接、引用块、围栏代码
- **斜杠菜单（`/`）** —— 块类型 + 全部 BB 命令，预填好
- **内联 `Cmd+B Cmd+B`** —— 不切上下文触发任意 `<bb-*>` 标签
- **流式 AI 块** —— 结果以一个 ProseMirror 类型节点的形式内联出现
- **Frontmatter 类型化面板** —— `title` · `date` · `tags` · `categories` · `author` · `slug` · `draft` · `description` 渲染为类型化控件（日期选择器、chip、开关、textarea）。原始 YAML 仍作为可折叠兜底保留
- **Prism 语法高亮** —— 20+ 种语言；配色跟随 VS Code 明/暗/高对比度主题
- **IME 友好** —— CJK 组合事件期间禁用自动保存和 BB 触发
- **Arrow 连字** —— 代码块和 IME 之外，`->` → `→`，`=>` → `⇒`
- **紧凑保存** —— bullet 统一为 `-`、多余空行合并、HTML 实体解码——Git diff 保持安静
- **外部修改横幅** —— 你有未保存编辑时文件被外部改动，提示 Reload 或 Keep
- **粘贴即落盘** —— 图片和文件粘贴/拖入会写到文档同目录（或 `blogbuddy.assetDir`），以相对路径插入
- **Zen / Read 布局切换** —— 右上角小 `Z` / `R` 按钮，在 Zen 模式（居中 860px，专注写作）和 Read 模式（铺满视口，长篇阅读更舒服）之间切换。选择跨会话保留
- **自动保存** + `Cmd+S` 立即 flush

---

## AI 阅读视图 —— 重新设计你的 Markdown

触发 `<bb-render-*>`，AI 把你的文档重新诠释为一份完整 HTML "阅读 artifact"，渲染在侧边面板，永远不动你的源文件。

| 预设 | 给模型的简报 |
|---|---|
| `<bb-render-blog:>` | 精致博客文 —— 黏性 TOC、callout、舒适行宽 |
| `<bb-render-skim:>` | 顶端 TL;DR、密集的视觉结构、`<details>` 折叠可跳过的细节 |
| `<bb-render-expl:>` | 教学 artifact —— SVG 图示、代码注释、"why this matters" 侧栏 |
| `<bb-render:你的 prompt>` | 自定义 —— 你的 prompt 主导整个创作方向 |

- **沙盒 iframe 内的流式实时预览** —— 看着 HTML 自己长出来
- **可编辑的提示词 + Regenerate** —— 改 prompt 不用重写标签
- **导出为单文件 `.html`** —— 默认把本地图片 base64 内嵌（设 `blogbuddy.reader.inlineAssets` 为 `false` 可保留相对路径）
- **`.bbreader.md` 样式参考**（可选）—— 在工作区根放一份，描述你博客的字体、配色、组件等；每次 render 都会作为权威样式指南被读入。跑 **BlogBuddy: Create .bbreader.md Template** 生成模板
- **源文件改动横幅** —— 按需手动重渲，绝不自动触发（render 又慢又费 token）
- **成本守门**（约 25k 输入 token）—— 大文件先弹确认再花钱

---

## 快速开始

1. 从 VS Code Marketplace 安装 **BlogBuddy**。
2. 配置凭证 —— 在设置里填 `blogbuddy.apiKey`，**或者**导出 `BLOGBUDDY_API_KEY`（或 `OPENAI_API_KEY`）。
3. *（可选）* 设置 `blogbuddy.baseURL` 切换到 OpenAI 兼容的 provider（OpenRouter、DeepSeek、自建代理）。默认值：`https://api.openai.com/v1`。
4. 在命令面板跑 **BlogBuddy: Select Model** —— 从 `/v1/models` 列表选一个，或手动输入。
5. 打开任意 `.md` 文件，插入标签，按 `Cmd+B Cmd+B`。

---

## 参考

### 快捷键

| 场景 | 快捷键 | 操作 |
|---|---|---|
| Markdown 编辑器 | `Cmd+B Cmd+B` / `Ctrl+B Ctrl+B` | 在当前块或选区上执行 BB 命令 |
| 文件管理器（选中 `.md`） | `Cmd+B` / `Ctrl+B` | 打开 BB 编辑器 |
| BB 编辑器 | `/` | 斜杠菜单（BB 命令 + 块类型） |
| BB 编辑器 | `Cmd+B Cmd+B` | 触发内联 `<bb-*>` 标签 |
| BB 编辑器 | `Cmd+S` | 立即保存 |
| BB 编辑器 | `Backspace`（标题行开头） | 把标题转回普通段落 |

### 设置

只有 `apiKey` 和 `model` 是必填，其余都有合理默认值。

| Key | 说明 |
|---|---|
| `blogbuddy.apiKey` | API key。依次回退到 `$BLOGBUDDY_API_KEY` → `$OPENAI_API_KEY` |
| `blogbuddy.baseURL` | OpenAI 兼容 base URL。依次回退到 `$BLOGBUDDY_BASE_URL` → `$OPENAI_BASE_URL` → `https://api.openai.com/v1` |
| `blogbuddy.model` | 模型 id。推荐跑 **BlogBuddy: Select Model** 从 provider 列表里选 |
| `blogbuddy.assetDir` | BB 编辑器资源上传的相对子目录（如 `assets`）。留空 = 保存在文档同目录 |
| `blogbuddy.reader.inlineAssets` | Reader 导出时是否把本地图片 base64 内嵌成单文件 HTML。默认 `true` |

### 命令

打开命令面板（`Cmd+Shift+P` / `Ctrl+Shift+P`），输入 `BlogBuddy:`。

| 命令 | 用途 |
|---|---|
| `BlogBuddy: Hi BB` | 在当前范围执行 BB 命令（等同于快捷键） |
| `BlogBuddy: Open BB Editor` | 用 BB 编辑器打开当前 `.md` |
| `BlogBuddy: Select Model` | 拉 `/v1/models` 列表，选一个或输入自定义 id |
| `BlogBuddy: Show Config Diagnostics` | 脱敏报告——扩展实际读到每个字段的值和来源 |
| `BlogBuddy: Show Usage Statistics` | Token 用量、请求次数、按模型计费（有定价数据时） |
| `BlogBuddy: Reset Usage Statistics` | 清空计数器（带确认） |
| `BlogBuddy: Refresh Pricing Data` | 重新拉定价数据 |
| `BlogBuddy: Create .bbreader.md Template` | 在工作区根创建 AI Reader 样式参考模板 |

### 状态栏

右侧两个小项，仅 Markdown 文件可见：

- **字数统计** —— 中文字符与英文单词分别计数后求和
- **配置来源** —— `$(key) BB · cfg | env | default` 显示 `apiKey` 的来源；缺 key 或缺 model 时变黄。Hover 看每字段来源表，点击打开诊断

---

## 备注

> **开发状态。** BlogBuddy 处于积极开发中。功能可能在版本之间移动、损坏或变更。生产工作流中请谨慎使用。
>
> **实验性。** 自由模式 `<bb:>` 最灵活也最耗 token——能用专用标签解决就别用 `<bb>`。

<details>
<summary><strong>macOS —— 环境变量没读到？</strong></summary>

从 Dock 或 Spotlight 启动的 App 不会继承你的 shell 配置。两个办法：

- **从终端启动**：`source ~/.zshrc && code .`
- **持久化**：`launchctl setenv OPENAI_API_KEY 'sk-...'`，然后 ⌘Q 彻底退出再重启 VS Code

跑 **BlogBuddy: Show Config Diagnostics** 看扩展实际读到了什么。

</details>

---

## 适合谁

博客作者和内容创作者 · 需要图表和翻译的技术写作者 · 多语言博主 · 比起开新标签页更愿意按个快捷键的人。

## 反馈

发现 bug 或想要新功能 → [提交 issue](https://github.com/FulcrumStd/blogbuddy/issues)。

---

<div align="center">
<sub>为在 Markdown 里写作的人精心打造。</sub>
</div>
