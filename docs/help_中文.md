# BlogBuddy - AI 驱动的写作助手

[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)

[![BB](https://img.shields.io/badge/translated_by-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)

BlogBuddy 是一个功能强大的 VS Code 扩展，通过 AI 驱动的功能增强你的写作工作流。无论你是在撰写技术文档、博客文章，还是任何 Markdown 内容，BlogBuddy 都能在编辑器中提供智能文本处理能力。

## 🚀 快速开始

1. **安装并配置**：在 VS Code 设置中设置你的 API 密钥
2. **打开一个 Markdown 文件**：BlogBuddy 在 `.md` 文件中效果最佳
3. **使用命令**：通过命令面板或快捷键访问功能
4. **使用 BB 标签**：将特殊命令直接嵌入文本中

## 📋 主要功能概览

BlogBuddy 提供三种主要方式来增强你的写作：

### 1. 基于菜单的命令 (Ctrl+Shift+B)

通过交互式菜单界面访问组织良好的功能。

### 2. 内联 BB 命令

将特殊标签直接嵌入文本以进行即时 AI 处理。

### 3. 文档统计 (Ctrl+Shift+D)

在 Markdown 文件的状态栏中实时显示词数。

---

## 🏷️ BB 命令系统

BB 命令系统允许你使用特殊标签将 AI 指令直接嵌入文本中。系统会智能判断处理范围，基于光标位置以及是否选择了文本。按 `Cmd+B Cmd+B`（Mac）或 `Ctrl+B Ctrl+B`（Win/Linux）执行。

**智能范围检测：**

- **手动选择**：当你手动选择文本时，仅处理所选内容
- **当前行处理**：当光标位于包含 BB 标签和其他内容的行时，仅处理该行
- **段落处理**：当光标位于仅包含 BB 标签的行（或没有 BB 标签）的行时，系统会在周围段落（由空行分隔的文本块）中搜索 BB 命令并处理整个段落
- **全文模式**：某些命令（例如 `bb-tslt`、`bb-impv` 在独立时）可以处理整个文档

**处理模式：**

- **文本块模式**：当 BB 命令与其他内容在同一文本块（由空行分隔）时，仅处理该文本块
- **全文模式**：当 BB 命令单独占据一行且上下两侧为空行（文本块中没有其他内容）时，处理整个文档

### 命令语法

```
<command:optional-message>
```

### 可用的 BB 命令

#### 1. `<bb-expd:additional-context>` - 文本扩展

**目的**：在保留原意的同时扩展并阐述现有内容  
**用法**：将命令放置在你想扩展的内容所在的同一文本块中  
**示例**：

```markdown
Machine learning is changing software development.
<bb-expd:make this suitable for a technical blog>

API design is important for scalability.
<bb-expd:add practical examples and use cases>
```

**功能**：

- 读取完整文档上下文以进行连贯扩展
- 保持原有语气和风格
- 添加具体示例和阐述性细节
- 确保与周围内容自然整合

#### 2. `<bb-impv:style-instructions>` - 文本改进

**目的**：增强文本的清晰度、语法和整体质量  
**用法**：基于内容选择有两种不同模式  
**示例**：

**文本块模式（有内容）：**

```markdown
This paragraph has some repetitive content that says the same thing multiple times in different ways.
<bb-impv:make more concise and remove redundancy>

The API endpoint kinda works but sometimes it's slow.
<bb-impv:improve professional tone>
```

**全文模式（命令被空行隔离）：**

```markdown
Some content above...

<bb-impv:improve the entire document's professional tone>

Some content below...

---

Other content above...

<bb-impv:enhance grammar and readability throughout the document>

Other content below...
```

**行为**：

- **文本块模式**：当 BB 命令与其他内容共享文本块时，仅在原位改进该文本块并利用文档上下文
- **全文模式**：当 BB 命令被空行隔离（单独占据其文本块）时，处理整个文档并创建带有 `_improved` 后缀的新文件

**功能**：

- 修复语法、拼写和标点
- 改善句子结构和流畅度  
- 保持作者的声音和写作风格
- 使用完整文档上下文以确保一致性

#### 3. `<bb-tslt:target-language>` - 翻译

**目的**：将整篇文档翻译成指定语言  
**用法**：需要指定目标语言  
**示例**：

```markdown
<bb-tslt:中文>
<bb-tslt:Japanese>
<bb-tslt:Français>
<bb-tslt:translate to Spanish>
```

**功能**：

- 翻译整篇文档（而非仅选中文本）
- 创建带有语言后缀的新文件
- 保留 Markdown 格式和结构
- 适当处理代码块
- 生成指向翻译版本的 Markdown 链接

#### 4. `<bb-mmd:diagram-instructions>` - Mermaid 图表

**目的**：通过分析文本内容生成 Mermaid 图表并将其转换为可视化表示  
**用法**：将命令放在描述流程、工作流或系统结构的文本块中  
**示例**：

```markdown
User registration process:
1. User enters email and password
2. System validates credentials
3. If valid, create account
4. Send confirmation email
5. User confirms email
6. Account activated
<bb-mmd:create a flowchart>

API Authentication Flow:
- Client sends credentials to /auth endpoint
- Server validates credentials
- Server returns JWT token
- Client includes token in subsequent requests
- Server validates token on each request
<bb-mmd:make this a sequence diagram>
```

**功能**：

- 分析文本内容以理解结构和关系
- 自动选择适当的图表类型（流程图、时序图、类图、状态图、ER、甘特图、饼图）
- 可输出为代码块或 SVG 图像（可在设置中配置）
- 使用 Kroki 服务验证生成的 Mermaid 语法
- 生成格式正确、语法正确的图表

#### 5. `<bb-kwd:keyword-focus>` - 关键词提取

**目的**：从内容中提取符合 SEO 的关键词  
**用法**：分析文档内容以生成相关关键词  
**示例**：

```markdown
<bb-kwd:focus on technical terms>
<bb-kwd:emphasize business keywords>
<bb-kwd:>  <!-- Uses default extraction -->
```

**功能**：

- 提取 8-12 个相关关键词/短语
- 包含主要关键词、长尾词组和辅助术语
- 以有组织、对 SEO 友好的列表格式输出
- 分析完整文档上下文

#### 6. `<bb-tldr:summary-style>` - TL;DR 生成

**目的**：生成内容的简明摘要  
**用法**：创建“太长没看”类型的摘要  
**示例**：

```markdown
<bb-tldr:focus on actionable insights>
<bb-tldr:technical summary>
<bb-tldr:>  <!-- Standard summary -->
```

**功能**：

- 生成最多 2-4 个要点或 2-3 句简短陈述
- 聚焦于要点和关键洞见
- 创建自包含、易于扫描的摘要
- 分析完整文档内容

#### 7. `<bb-tag>` - BB 徽章

**目的**：添加 BlogBuddy 署名徽章  
**用法**：简单的标签插入  
**示例**：

```markdown
<bb-tag>
```

**输出**：`[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)`

#### 8. `<bb:your-instruction>` - 通用 AI 任务 ⚠️

**目的**：执行任何具有自定义指令的 AI 任务  
**用法**：根据内容选择有两种不同模式

> **⚠️ 重要提示**：这是最强大且最灵活的命令。由于任务的复杂性和开放性，可能需要更高性能的 AI 模型，并且与其他专用命令相比，可能导致显著更高的 token 使用量和费用。对于无法使用上述专用命令完成的任务，请谨慎使用。

**示例**：

**文本块模式（有内容）：**

```markdown
This is some casual text that needs improvement.
<bb:rewrite this in a more professional tone>

AI is useful for many tasks.
<bb:add examples and make it more detailed>

- Feature 1: Description
- Feature 2: Description
<bb:convert this list to a table format>
```

**全文模式（命令被空行隔离）：**

```markdown
Some previous content here.

<bb:rewrite the entire document in a more professional tone>

Some following content here.

---

Other content above...

<bb:convert all lists in this document to table format>

Other content below...
```

**行为**：

- **文本块模式**：当 BB 命令与其他内容共享文本块时，仅在原位处理该文本块
- **全文模式**：当 BB 命令被空行隔离（单独占据其文本块）时，处理整个文档并创建带有 `_processed` 后缀的新文件

**性能注意事项**：

- 对于复杂指令，可能需要更强大的 AI 模型
- 可能比专用命令消耗更多 token
- 复杂任务的处理时间可能更长
- 如有可能，考虑使用专用命令（expd、impv、tslt 等）以提高效率

---

## 📊 文档统计系统 (Ctrl+Shift+D)

通过实时词数显示跟踪你的写作进度：

### 功能

- **智能词数统计**：自动分别检测并统计中文字符和英文单词
- **状态栏显示**：在 VS Code 状态栏中以不显眼的方式显示词数
- **点击切换**：点击状态栏项可快速启用/禁用该功能
- **仅限 Markdown**：统计仅在 Markdown (.md) 文件中显示
- **实时更新**：在你输入或编辑内容时自动更新词数

### 使用方法

1. 打开一个 Markdown 文件
2. 按 `Ctrl+Shift+D`（Windows/Linux）或 `Cmd+Shift+D`（Mac）以启用
3. 词数会出现在右侧的状态栏
4. 点击状态栏项可切换开/关
5. 再次按快捷键以禁用

### 配置

该功能可在 VS Code 设置中永久启用/禁用：

- 设置：`blogbuddy.documentInfoDisplay`
- 默认值：`false`（禁用）
- 当你使用切换命令时，该设置会自动更新

---

## 🎛️ 菜单系统 (Ctrl+Shift+B)

通过交互式菜单访问组织良好的功能：

### 使用统计

- 按功能查看 AI 使用统计
- 跟踪 token 消耗和请求次数
- 在需要时重置统计数据
- 导出详细的使用报告

### 帮助信息

- 访问这份综合帮助文档
- 在编辑器中查看或以通知形式显示
- 始终保持最新的功能参考

---

## ⚙️ 配置

### 必需设置

1. **API Key** (`blogbuddy.apiKey`)：你的 AI 服务 API 密钥
2. **Base URL** (`blogbuddy.baseURL`)：AI 服务端点（默认：`https://openrouter.ai/api/v1`）
3. **Model** (`blogbuddy.model`)：使用的 AI 模型（默认：`openai/gpt-5-mini`）

### 可选设置

- **Mermaid 代码** (`blogbuddy.mermaidCode`)：选择 Mermaid 图表的输出格式
  - `false`（默认）：创建带有 ![image](file.svg) 引用的 SVG 图像文件
  - `true`：生成可在 Markdown 查看器中内联渲染的代码块（```mermaid```）

### 配置访问

- 打开 VS Code 设置（`Ctrl+,` / `Cmd+,`）
- 搜索 "Blog Buddy" 或 "blogbuddy"
- 配置以下四个可用设置：
  - `blogbuddy.apiKey`
  - `blogbuddy.baseURL`
  - `blogbuddy.model`
  - `blogbuddy.mermaidCode`

---

## 💡 专家提示

### 最佳实践

1. **利用智能检测**：系统会根据光标位置自动确定范围
   - **行级编辑**：将光标放在带有 BB 标签和内容的行上以进行单行处理
   - **段落级编辑**：将光标放在包含 BB 标签的段落中的任意位置
   - **手动控制**：选择特定文本以覆盖自动检测
2. **掌握空行控制**：空行仍然决定文档级处理
   - **同一文本块**（无空行）：仅处理该内容
   - **被空行隔离**：处理整个文档
3. **选择你的模式**：
   - 对于快速行编辑：将 BB 标签和内容放在同一行
   - 对于段落改进：将 BB 标签放在段落中的任意位置
   - 对于整篇文档处理：用上下空行隔离命令
4. **上下文很重要**：BB 命令会读取整个文档以获得更好的上下文
5. **明确指示**：在命令消息中提供清晰的指令
6. **文件类型**：在 Markdown (.md) 文件中效果最佳
7. **备份重要工作**：BB 会为文档级操作创建新文件

### 工作流集成

1. **先起草**：先写初稿，然后使用 BB 命令进行增强
2. **迭代改进**：使用多个命令逐步提升内容质量
3. **审查输出**：在最终定稿前始终审核 AI 生成的内容
4. **组合功能**：使用扩展 → 改进 → 翻译 的工作流

### 命令组合

**行级处理（内容和 BB 标签在同一行）：**

```markdown
Machine learning is a subset of AI. <bb-expd:add practical examples>

This feature improves user experience. <bb-impv:make more technical>
```

**文本块模式（段落处理）：**

```markdown
Your initial paragraph here.
<bb-expd:add technical details>

After expansion, this content needs polishing.
<bb-impv:make more professional>
```

**全文模式（文档范围处理）：**

```markdown
Some content here...

<bb-impv:improve grammar and readability throughout the entire document>

More content here...

<bb-kwd:focus on technical SEO terms>

Final content here...
```

---

## 🔧 快捷键与命令

| 操作 | 快捷键 | 命令 |
|--------|----------|---------|
| 执行 BB 命令 | `Cmd+B Cmd+B` (Mac)<br>`Ctrl+B Ctrl+B` (Win/Linux) | `blogbuddy.bb` |
| 打开主菜单 | `Cmd+Shift+B` (Mac)<br>`Ctrl+Shift+B` (Win/Linux) | `blogbuddy.menu` |
| 切换文档统计 | `Cmd+Shift+D` (Mac)<br>`Ctrl+Shift+D` (Win/Linux) | `blogbuddy.toggleDocumentInfo` |
| 查看使用统计 | 菜单 → 使用统计 | N/A |
| 打开帮助 | 菜单 → 帮助信息 | N/A |

---

## ❓ 故障排除

### 常见问题

**🔴 “API Key 未配置”**

- 解决方案：在 VS Code 设置的 BlogBuddy 部分设置 API 密钥

**🔴 “BB 无法识别命令：[command]”**

- 解决方案：检查命令语法，确保使用受支持的 BB 命令

**🔴 “翻译需要目标语言”**

- 解决方案：在翻译命令中指定目标语言（例如 `<bb-tslt:Spanish>`）

**🔴 “文件读取失败”**

- 解决方案：确保文件已保存且为支持的类型（.md、.txt）

**🔴 生成的内容看起来偏离主题**

- 解决方案：在命令指示中更具体，检查文档上下文

### 性能提示

- 在处理前保存文件以获得更好的上下文
- 使用具体指示而非泛泛的命令
- 对于大型文档，考虑分段处理
- 通过统计菜单监控 token 使用

### 获取支持

- 检查 VS Code 开发者控制台以获取详细错误信息
- 在 Output 面板中查看扩展日志
- 确保 AI 服务的网络连接稳定
- 验证文档级操作的文件权限

---

## 🔄 版本历史与更新

BlogBuddy 正在积极开发并定期更新。新功能和改进基于用户反馈和 AI 技术进步持续加入。

### 最近的增强功能

- 增强的上下文感知以获得更好的 AI 响应
- 改进的错误处理和用户反馈
- 扩展的 Mermaid 图表支持
- 通过语言推断提升的翻译质量

---

为高效写作流程倾注 ❤️
