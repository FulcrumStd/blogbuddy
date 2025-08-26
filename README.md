# BlogBuddy - Your AI-Powered Blog Writing Sidekick

<div align="center">

![BlogBuddy Logo](images/logo.png)

**Blog Buddy** makes Markdown magic happen with AI-powered writing assistance!

[![Version](https://img.shields.io/badge/version-0.0.1-FFD900.svg)](https://github.com/SandyKidYao/blogbuddy)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC.svg)](https://marketplace.visualstudio.com/items?itemName=blogbuddy.blogbuddy)
[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/SandyKidYao/blogbuddy)

</div>

[中文 Version](README_中文.md)

## ⚠️ Important Notice

> **🚧 Development Status**: This project is currently in active development. Features may have bugs and are subject to change in future updates. Please use with caution in production environments.

> **🧪 Experimental Feature**: The `bb` command (AI Agent mode) is currently under development and in experimental stage. This feature may not work as expected and could undergo significant changes.

## ✨ What is Blog Buddy?

Blog Buddy (BB) is a VS Code extension designed to enhance your blog writing workflow without disrupting your creative flow. Instead of switching contexts or opening external tools, you simply insert BB command tags directly in your Markdown content and trigger them with keyboard shortcuts. It's that simple!

## 🚀 Key Features

### Smart Command Tags
Use intuitive command tags anywhere in your blog posts (all tags support `<bb-xxx:custom instructions>` format):
- `<bb:task description>` - Direct AI agent mode - give BB any task to complete
- `<bb-expd:expansion requirements>` - Expand and elaborate on surrounding text content
- `<bb-impv:improvement focus>` - Polish text quality (inline for local text, standalone for full document)
- `<bb-tslt:target language>` - Translate content (must specify target language)
- `<bb-tldr:summary style>` - Generate TL;DR summaries
- `<bb-mmd:diagram description>` - Generate Mermaid diagrams
- `<bb-kwd:keyword focus>` - Extract keywords
- `<bb-tag>` - Add BlogBuddy attribution badge

### Seamless Workflow Integration
- **Non-intrusive**: Commands are embedded directly in your content
- **Keyboard-driven**: Activate with simple key combinations
- **Context-aware**: AI understands your full document context
- **Instant results**: Commands execute and replace content in-place

### AI-Powered Assistance
BlogBuddy leverages advanced AI models to help you:
- **Expand** brief ideas into full paragraphs
- **Improve** text clarity, grammar, and flow
- **Translate** content to different languages
- **Summarize** long content with TL;DR sections
- **Create** visual diagrams with Mermaid syntax
- **Extract** relevant keywords for SEO

## 📖 How to Use

### Quick Start
1. Install BlogBuddy from the VS Code marketplace
2. Configure your AI provider settings (API key, base URL, model)
3. Start writing your blog post in Markdown
4. Insert BB commands where you need AI assistance
5. Use keyboard shortcuts to activate commands

### Basic Usage
1. **Insert a command tag** in your text:
   ```markdown
   Here's a brief overview of machine learning.
   <bb-expd:focus on practical applications>
   ```

2. **Select the text** containing the command tag (and surrounding content for context)

3. **Press the activation key**: `Cmd+B Cmd+B` (Mac) or `Ctrl+B Ctrl+B` (Windows/Linux)

4. **Watch BB work its magic** - the command tag and surrounding text will be processed and replaced with AI-generated content

### Menu Access
Alternatively, use `Cmd+Shift+B` (Mac) or `Ctrl+Shift+B` (Windows/Linux) to open the BB menu for additional options.

### 📚 Detailed Documentation
For comprehensive feature documentation, examples, and advanced usage tips, see our detailed guide:
**➡️ [Complete User Guide](docs/help.md)**

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+B Cmd+B` (Mac)<br>`Ctrl+B Ctrl+B` (Win/Linux) | Execute BB command on selected text |
| `Cmd+Shift+B` (Mac)<br>`Ctrl+Shift+B` (Win/Linux) | Open BB menu |

## ⚙️ Configuration

BlogBuddy requires AI provider configuration. Go to VS Code Settings and configure:

- **API Key**: Your AI provider API key
- **Base URL**: AI service endpoint (default: OpenRouter)
- **Model**: AI model to use (default: GPT-5-mini)

## 🎯 Perfect For

- **Blog Writers** who want AI assistance without leaving their editor
- **Content Creators** looking to enhance their writing workflow
- **Technical Writers** who need diagram generation and content expansion
- **Multilingual Bloggers** requiring translation assistance
- **Anyone** who values seamless, keyboard-driven productivity

## 🐛 Issues & Feedback

Found a bug or have a feature suggestion? Please [open an issue](https://github.com/SandyKidYao/blogbuddy/issues) on our GitHub repository.

---

**Happy Blogging with BB! 🎉**
