# BlogBuddy - Your AI-Powered Blog Writing Sidekick

<div align="center">

![BlogBuddy Logo](images/logo.png)

**Blog Buddy** 借助 AI 写作辅助，让 Markdown 魔法成真！

[![Version](https://img.shields.io/badge/version-0.0.1-FFD900.svg)](https://github.com/SandyKidYao/blogbuddy)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC.svg)](https://marketplace.visualstudio.com/items?itemName=blogbuddy.blogbuddy)
[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/SandyKidYao/blogbuddy)
[![BB](https://img.shields.io/badge/translated_by-BB-FFD900)](https://github.com/SandyKidYao/blogbuddy)

</div>

## ✨ What is Blog Buddy?

Blog Buddy (BB) 是一款为 VS Code 设计的扩展，用于增强你的博客写作工作流而不打断创作节奏。你无需切换上下文或打开外部工具，只需在 Markdown 内容中直接插入 BB 命令标签，并用快捷键触发即可。就是这么简单！

## 🚀 Key Features

### Smart Command Tags
在文章任何位置使用直观的命令标签（所有标签支持 `<bb-xxx:custom instructions>` 格式）：
- `<bb:task description>` - 直接的 AI 代理模式 - 让 BB 完成任何任务
- `<bb-expd:expansion requirements>` - 扩展并详述周围的文本内容
- `<bb-impv:improvement focus>` - 润色文本质量（用于局部文本的内联方式，或用于整个文档的独立方式）
- `<bb-tslt:target language>` - 翻译内容（必须指定目标语言）
- `<bb-tldr:summary style>` - 生成 TL;DR 摘要
- `<bb-mmd:diagram description>` - 生成 Mermaid 图表
- `<bb-kwd:keyword focus>` - 提取关键词
- `<bb-tag>` - 添加 BlogBuddy 署名徽章

### Seamless Workflow Integration
- **非侵入式**：命令直接嵌入内容中
- **以键盘为中心**：使用简单的组合键激活
- **上下文感知**：AI 能理解整个文档的上下文
- **即时结果**：命令在原位执行并替换内容

### AI-Powered Assistance
BlogBuddy 利用先进的 AI 模型帮助你：
- **扩展** 简短想法为完整段落
- **改进** 文本的清晰度、语法与流畅性
- **翻译** 内容到不同语言
- **总结** 冗长内容并生成 TL;DR 部分
- **创建** 使用 Mermaid 语法的可视化图表
- **提取** 有助于 SEO 的相关关键词

## 📖 How to Use

### Quick Start
1. 从 VS Code marketplace 安装 BlogBuddy
2. 配置你的 AI 提供商设置（API key、base URL、model）
3. 在 Markdown 中开始撰写博客文章
4. 在需要 AI 帮助的地方插入 BB 命令
5. 使用快捷键激活命令

### Basic Usage
1. **在文本中插入命令标签**：
   ```markdown
   Here's a brief overview of machine learning.
   <bb-expd:focus on practical applications>
   ```

2. **选中包含命令标签的文本**（以及用于上下文的周围内容）

3. **按激活键**：`Cmd+B Cmd+B` (Mac) 或 `Ctrl+B Ctrl+B` (Windows/Linux)

4. **观看 BB 发挥魔法** - 命令标签和周围文本将被处理并替换为 AI 生成的内容

### Menu Access
或者使用 `Cmd+Shift+B` (Mac) 或 `Ctrl+Shift+B` (Windows/Linux) 打开 BB 菜单以访问更多选项。

### 📚 Detailed Documentation
有关完整功能文档、示例和高级用法技巧，请参阅我们的详细指南：
**➡️ [完整的使用指南](docs/help_中文.md)**

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+B Cmd+B` (Mac)<br>`Ctrl+B Ctrl+B` (Win/Linux) | 在选中文本上执行 BB 命令 |
| `Cmd+Shift+B` (Mac)<br>`Ctrl+Shift+B` (Win/Linux) | 打开 BB 菜单 |

## ⚙️ Configuration

BlogBuddy 需要配置 AI 提供商。前往 VS Code 设置并配置：

- **API Key**：你的 AI 提供商 API key
- **Base URL**：AI 服务端点（默认：OpenRouter）
- **Model**：使用的 AI 模型（默认：GPT-4o-mini）
- **Mermaid Output**：在代码块或渲染图片之间选择输出形式

## 🎯 Perfect For

- **博客作者**，希望在不离开编辑器的情况下获得 AI 辅助
- **内容创作者**，想要提升写作工作流
- **技术写作者**，需要生成图表和扩展内容
- **多语言博主**，需要翻译帮助
- **任何人**，重视无缝的键盘驱动型高效工作方式

## 🐛 Issues & Feedback

发现 bug 或有功能建议？请在我们的 GitHub 仓库上 [open an issue](https://github.com/SandyKidYao/blogbuddy/issues)。

---

**Happy Blogging with BB! 🎉**
