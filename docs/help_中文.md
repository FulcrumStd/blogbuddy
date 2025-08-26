# BlogBuddy - AI 驱动的写作助手
[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)
[![BB](https://img.shields.io/badge/translated_by-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)

BlogBuddy 是一个强大的 VS Code 扩展，通过 AI 驱动的功能增强你的写作工作流。无论你是在编写技术文档、博客文章，还是任何 Markdown 内容，BlogBuddy 都能在编辑器中提供智能文本处理能力。

## 🚀 快速开始

1. **安装并配置**：在 VS Code 设置中设置你的 API 密钥
2. **打开一个 Markdown 文件**：BlogBuddy 在 `.md` 文件中效果最佳
3. **使用命令**：通过命令面板或快捷键访问功能
4. **使用 BB 标签**：在文本中直接嵌入特殊命令

## 📋 主要功能概览

BlogBuddy 提供两种与 AI 交互的方式：

### 1. 基于菜单的命令 (Ctrl+Shift+B)
通过交互式菜单界面访问组织良好的功能。

### 2. 行内 BB 命令
在文本中直接嵌入特殊标签以获得即时的 AI 处理。

---

## 🏷️ BB 命令系统

BB 命令系统允许你使用特殊标签在文本中直接嵌入 AI 指令。你可以将命令放在与内容同一行或单独的一行。将光标放在文本块的任意位置（或选择特定文本）并按 `Cmd+B Cmd+B`（Mac）或 `Ctrl+B Ctrl+B`（Win/Linux）来执行。

**工作原理：**
- **文本块模式**：当 BB 命令与其他内容在同一文本块（由空行分隔）时，仅处理该文本块
- **全文模式**：当 BB 命令单独占据一行，并且上下均为空行（文本块中没有其他内容）时，处理整个文档
- **手动选择**：当你手动选择文本时，无论模式如何，仅处理所选文本

### 命令语法
```
<command:optional-message>
```

### 可用的 BB 命令

#### 1. `<bb-expd:additional-context>` - 文本扩展
**目的**：在保持含义的同时扩展并详述现有内容  
**用法**：将命令放在你想要扩展的内容所在的同一文本块中  
**示例**：
```markdown
机器学习正在改变软件开发。
<bb-expd:make this suitable for a technical blog>

API 设计对于可扩展性非常重要。
<bb-expd:add practical examples and use cases>
```
**功能**：
- 阅读完整文档上下文以实现连贯扩展
- 保持原有语气和风格
- 添加具体示例和扩展细节
- 确保与周围内容自然融合

#### 2. `<bb-impv:style-instructions>` - 文本改进
**目的**：提升文本的清晰度、语法和整体质量  
**用法**：根据内容选择有两种不同模式  
**示例**：

**文本块模式（包含内容）：**
```markdown
这一段有一些重复的内容，用不同的方式反复表达同一件事。
<bb-impv:make more concise and remove redundancy>

API 端点能工作，但有时会很慢。
<bb-impv:improve professional tone>
```

**全文模式（命令被空行隔开）：**
```markdown
上面有一些内容...

<bb-impv:improve the entire document's professional tone>

下面有一些内容...

---

上面其他内容...

<bb-impv:enhance grammar and readability throughout the document>

下面其他内容...
```

**行为**：
- **文本块模式**：当 BB 命令与其他内容共享同一文本块时，只在原位改进该文本块并参考文档上下文
- **全文模式**：当 BB 命令被空行隔离（单独占据文本块）时，处理整个文档并创建带有 `_improved` 后缀的新文件

**功能**：
- 修正语法、拼写和标点
- 改善句子结构和流畅度  
- 保持作者的声音和风格
- 使用全文上下文以保证一致性

#### 3. `<bb-tslt:target-language>` - 翻译
**目的**：将整个文档翻译为指定语言  
**用法**：需要指定目标语言  
**示例**：
```markdown
<bb-tslt:中文>
<bb-tslt:Japanese>
<bb-tslt:Français>
<bb-tslt:translate to Spanish>
```
**功能**：
- 翻译整个文档（而不仅仅是选定文本）
- 创建带有语言后缀的新文件
- 保留 Markdown 格式和结构
- 适当处理代码块
- 生成指向翻译版本的 Markdown 链接

#### 4. `<bb-mmd:diagram-instructions>` - Mermaid 图表
**目的**：通过分析文本内容生成 Mermaid 图表并将其转换为可视化表示  
**用法**：将命令放在描述流程、工作流或系统结构的文本块中  
**示例**：
```markdown
用户注册流程：
1. 用户输入电子邮件和密码
2. 系统验证凭证
3. 若验证通过，创建账户
4. 发送确认邮件
5. 用户确认邮件
6. 账户激活
<bb-mmd:create a flowchart>

API 认证流程：
- 客户端将凭证发送到 /auth 端点
- 服务器验证凭证
- 服务器返回 JWT 令牌
- 客户端在后续请求中包含令牌
- 服务器在每次请求中验证令牌
<bb-mmd:make this a sequence diagram>
```
**功能**：
- 分析文本内容以理解结构和关系
- 自动选择合适的图表类型（流程图、序列图、类图、状态图、ER 图、甘特图、饼图）
- 可输出为代码块或 SVG 图像（可在设置中配置）
- 使用 Kroki 服务验证生成的 Mermaid 语法
- 创建格式正确、语法无误的图表

#### 5. `<bb-kwd:keyword-focus>` - 关键词提取
**目的**：从内容中提取对 SEO 友好的关键词  
**用法**：分析文档内容以生成相关关键词  
**示例**：
```markdown
<bb-kwd:focus on technical terms>
<bb-kwd:emphasize business keywords>
<bb-kwd:>  <!-- 使用默认提取 -->
```
**功能**：
- 提取 8-12 个相关的关键词/短语
- 包括主要关键词、长尾短语和辅助术语
- 格式化为有组织的、对 SEO 友好的列表
- 分析全文上下文

#### 6. `<bb-tldr:summary-style>` - TL;DR 生成
**目的**：生成内容的简明摘要  
**用法**：创建“太长；没看”的摘要  
**示例**：
```markdown
<bb-tldr:focus on actionable insights>
<bb-tldr:technical summary>
<bb-tldr:>  <!-- 标准摘要 -->
```
**功能**：
- 生成 2-4 个要点式要点或最多 2-3 句的摘要
- 聚焦要点和关键洞见
- 创建自包含、便于浏览的摘要
- 分析完整文档内容

#### 7. `<bb-tag>` - BB 徽章
**目的**：添加 BlogBuddy 归属徽章  
**用法**：简单标签插入  
**示例**：
```markdown
<bb-tag>
```
**输出**：`[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)`

#### 8. `<bb:your-instruction>` - 通用 AI 任务 ⚠️
**目的**：使用自定义指令执行任何 AI 任务  
**用法**：根据内容选择有两种不同模式

> **⚠️ 重要说明**：这是最强大且灵活的命令。由于任务的复杂性和开放性，可能需要性能更强的 AI 模型，并且相比其他专门命令会产生显著更高的 token 使用量和费用。对于无法通过上面特定命令完成的任务，请谨慎使用。

**示例**：

**文本块模式（包含内容）：**
```markdown
这是一段需要改进的随意文本。
<bb:rewrite this in a more professional tone>

AI 对许多任务很有用。
<bb:add examples and make it more detailed>

- 功能 1：描述
- 功能 2：描述
<bb:convert this list to a table format>
```

**全文模式（命令被空行隔开）：**
```markdown
此处为之前的内容。

<bb:rewrite the entire document in a more professional tone>

此处为后续内容。

---

上方其他内容...

<bb:convert all lists in this document to table format>

下方其他内容...
```

**行为**：
- **文本块模式**：当 BB 命令与其他内容共享同一文本块时，仅在原位处理该文本块
- **全文模式**：当 BB 命令被空行隔离（单独占据文本块）时，处理整个文档并创建带有 `_processed` 后缀的新文件

**性能注意事项**：
- 复杂指令可能需要更强的 AI 模型
- 相比专用命令可能消耗更多 token
- 复杂任务的处理时间可能更长
- 若可能，考虑使用专用命令（expd、impv、tslt 等）以提高效率

---

## 🎛️ 菜单系统 (Ctrl+Shift+B)

通过交互式菜单访问组织良好的功能：

### 使用统计
- 按功能查看 AI 使用指标
- 跟踪 token 消耗和请求次数
- 在需要时重置统计数据
- 导出详细的使用报告

### 帮助信息
- 访问本综合帮助文档
- 在编辑器中或作为通知查看
- 始终为最新功能参考

---

## ⚙️ 配置

### 必填设置
1. **API Key** (`blogbuddy.apiKey`)：你的 AI 服务 API 密钥
2. **Base URL** (`blogbuddy.baseURL`)：AI 服务端点（默认：`https://openrouter.ai/api/v1`）
3. **Model** (`blogbuddy.model`)：使用的 AI 模型（默认：`openai/gpt-5-mini`）

### 可选设置
- **Mermaid 输出格式** (`blogbuddy.mermaidCode`)：选择 Mermaid 图表的输出格式
  - `false`（默认）：创建带有 `![image](file.svg)` 引用的 SVG 图像文件
  - `true`：生成代码块（```mermaid```），在支持的 Markdown 查看器中内联渲染

### 配置访问
- 打开 VS Code 设置（`Ctrl+,` / `Cmd+,`）
- 搜索 “Blog Buddy” 或 “blogbuddy”
- 配置以下四个可用设置：
  - `blogbuddy.apiKey`
  - `blogbuddy.baseURL`
  - `blogbuddy.model`
  - `blogbuddy.mermaidCode`

---

## 💡 专家提示

### 最佳实践
1. **熟练使用空行控制**：空行决定处理范围
   - **同一文本块**（无空行）：仅处理该内容
   - **被空行隔离**：处理整个文档
2. **选择你的模式**：
   - 本地编辑：将命令与内容放在同一文本块（中间无空行）
   - 文档级处理：用上下空行将命令隔离
3. **上下文很重要**：BB 命令会读取整个文档以获得更好的上下文
4. **指令要具体**：在命令消息中提供清晰指示
5. **文件类型**：在 Markdown（.md）文件中效果最佳
6. **备份重要工作**：BB 会为文档级操作创建新文件

### 工作流整合
1. **先草拟**：先写初始内容，再使用 BB 命令增强
2. **迭代改进**：使用多个命令进行逐步增强
3. **审阅输出**：在最终定稿前始终审查 AI 生成内容
4. **组合功能**：使用“扩展 → 改进 → 翻译”的工作流

### 命令组合

**文本块模式（本地处理）：**
```markdown
你的初始段落在此。
<bb-expd:add technical details>

扩展后，这段内容需要润色。
<bb-impv:make more professional>
```

**全文模式（全文处理）：**
```markdown
此处一些内容...

<bb-impv:improve grammar and readability throughout the entire document>

此处更多内容...

<bb-kwd:focus on technical SEO terms>

最终内容在此...
```

---

## 🔧 快捷键 & 命令

| 操作 | 快捷键 | 命令 |
|--------|----------|---------|
| 执行 BB 命令 | `Cmd+B Cmd+B` (Mac)<br>`Ctrl+B Ctrl+B` (Win/Linux) | `blogbuddy.bb` |
| 打开主菜单 | `Cmd+Shift+B` (Mac)<br>`Ctrl+Shift+B` (Win/Linux) | `blogbuddy.menu` |
| 查看使用统计 | 菜单 → 使用统计 | N/A |
| 打开帮助 | 菜单 → 帮助信息 | N/A |

---

## ❓ 故障排除

### 常见问题

**🔴 “API Key not configured”**
- 解决方案：在 VS Code 设置的 BlogBuddy 部分设置 API 密钥

**🔴 “BB don't know cmd: [command]”**
- 解决方案：检查命令语法，确保使用受支持的 BB 命令

**🔴 “Translation requires target language”**
- 解决方案：在翻译命令中指定目标语言（例如 `<bb-tslt:Spanish>`）

**🔴 “File reading failed”**
- 解决方案：确保文件已保存且为支持的类型（.md、.txt）

**🔴 生成的内容似乎偏题**
- 解决方案：在命令指令中更具体，检查文档上下文

### 性能提示
- 在处理前保存文件以获得更好的上下文
- 使用具体指令而非笼统命令
- 对于大型文档，考虑分段处理
- 通过统计菜单监控 token 使用

### 获取支持
- 在 VS Code 开发者控制台查看详细错误信息
- 在输出面板查看扩展日志
- 确保 AI 服务的网络连接稳定
- 验证文档级操作的文件权限

---

## 🔄 版本历史与更新

BlogBuddy 正在积极开发并定期更新。根据用户反馈和 AI 技术进展不断添加新功能和改进。

### 最近的增强
- 增强的上下文感知以获得更好的 AI 响应
- 改进的错误处理和用户反馈
- 扩展的 Mermaid 图表支持
- 使用语言推断提升翻译质量

---

*Made with ❤️ for productive writing workflows*
