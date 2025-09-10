# BlogBuddy - 你的 AI 驱动的博客写作助手

<div align="center">

<img src="images/logo.png" alt="BlogBuddy 徽标" width="200">

**BlogBuddy** 通过 AI 驱动的写作助手让 Markdown 变得神奇！

[![版本](https://img.shields.io/badge/version-0.0.1-FFD900.svg)](https://github.com/FulcrumStd/blogbuddy)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC.svg)](https://marketplace.visualstudio.com/items?itemName=blogbuddy.blogbuddy)
[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)
[![BB](https://img.shields.io/badge/translated_by-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)

</div>

## ⚠️ 重要提示

> **🚧 开发状态**：本项目目前处于积极开发中。功能可能存在缺陷，且在未来更新中可能发生变化。请在生产环境中谨慎使用。

> **🧪 实验性功能**：`bb` 命令（AI Agent 模式）目前正在开发中，属于实验阶段。此功能可能无法按预期工作，并可能经历重大更改。

## ✨ 什么是 BlogBuddy？

BlogBuddy (BB) 是一款为 VS Code 设计的扩展，旨在在不打断创作流程的前提下增强你的博客写作工作流。你无需切换上下文或打开外部工具，只需在 Markdown 内容中直接插入 BB 命令标签，并通过快捷键触发它们。就是这么简单！

## 🚀 主要功能

### 智能命令标签

在博客文章中的任意位置使用直观的命令标签（所有标签均支持 `<bb-xxx:custom instructions>` 格式）：

- `<bb:task description>` - 直接 AI agent 模式 - 给 BB 下达任何任务以完成
- `<bb-expd:expansion requirements>` - 扩展并详述周围文本内容
- `<bb-impv:improvement focus>` - 润色文本质量（内联用于局部文本，独立用于整个文档）
- `<bb-tslt:target language>` - 翻译内容（必须指定目标语言）
- `<bb-tldr:summary style>` - 生成 TL;DR 摘要
- `<bb-mmd:diagram description>` - 生成 Mermaid 图表
- `<bb-kwd:keyword focus>` - 提取关键词
- `<bb-tag>` - 添加 BlogBuddy 归属徽章

### 无缝工作流集成

- **非侵入式**：命令直接嵌入内容中
- **键盘驱动**：通过简单的按键组合激活
- **上下文感知**：AI 理解你完整的文档上下文
- **即时结果**：命令执行并在原位替换内容

### AI 驱动的辅助

BlogBuddy 利用先进的 AI 模型帮助你：

- **扩展** 简短想法为完整段落
- **改进** 文本清晰度、语法和流畅度
- **翻译** 内容到不同语言
- **总结** 长内容并生成 TL;DR 部分
- **创建** 使用 Mermaid 语法的可视化图表
- **提取** 有助于 SEO 的相关关键词

### 文档统计

通过实时字数统计跟踪写作进度：

- **智能计数**：自动识别中文字符和英文单词
- **状态栏显示**：在 VS Code 状态栏显示不显眼的字数统计
- **仅限 Markdown**：仅为 Markdown 文件显示统计信息
- **开关控制**：通过快捷键或点击状态栏项启用/禁用

## 📖 如何使用

### 快速开始

1. 从 VS Code 市场安装 BlogBuddy
2. 配置你的 AI 提供商设置（API 密钥、Base URL、模型）
3. 在 Markdown 中开始撰写博客文章
4. 在需要 AI 帮助的地方插入 BB 命令
5. 使用快捷键激活命令

### 基本用法

1. **在文本中插入命令标签**：

   ```markdown
   Here's a brief overview of machine learning.
   <bb-expd:focus on practical applications>
   ```

2. **选择包含命令标签的文本**（以及用于上下文的周围内容）

3. **按激活键**：`Cmd+B Cmd+B` (Mac) 或 `Ctrl+B Ctrl+B` (Windows/Linux)

4. **见证 BB 的魔法** - 命令标签和周围文本将被处理并替换为 AI 生成的内容

### 菜单访问

或者，使用 `Cmd+Shift+B` (Mac) 或 `Ctrl+Shift+B` (Windows/Linux) 打开 BB 菜单以获取更多选项。

### 📚 详细文档

有关完整功能文档、示例和高级使用技巧，请参阅我们的详细指南：
**➡️ [完整用户指南](docs/help.md)**

## ⌨️ 键盘快捷键

| 快捷键 | 操作 |
|----------|--------|
| `Cmd+B Cmd+B` (Mac)<br>`Ctrl+B Ctrl+B` (Win/Linux) | 在所选文本上执行 BB 命令 |
| `Cmd+Shift+B` (Mac)<br>`Ctrl+Shift+B` (Win/Linux) | 打开 BB 菜单 |
| `Cmd+Shift+D` (Mac)<br>`Ctrl+Shift+D` (Win/Linux) | 切换文档统计显示 |

## ⚙️ 配置

BlogBuddy 需要 AI 提供商配置。前往 VS Code 设置并配置：

- **API 密钥**：你的 AI 提供商 API 密钥
- **Base URL**：AI 服务端点（默认：OpenRouter）
- **模型**：使用的 AI 模型（默认：GPT-5-mini）

## 🎯 适合人群

- **博客写作者** 希望在不离开编辑器的情况下获得 AI 帮助
- **内容创作者** 希望增强写作工作流
- **技术作者** 需要生成图表和扩展内容
- **多语言博主** 需要翻译辅助
- **任何人** 重视无缝、键盘驱动的高效工作方式

## 🐛 问题与反馈

发现 bug 或有功能建议？请在我们的 GitHub 仓库上 [提交问题](https://github.com/FulcrumStd/blogbuddy/issues)。

---

**祝使用 BB 写博客愉快！ 🎉**
