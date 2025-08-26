# BlogBuddy - AI-Powered Writing Assistant
[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)

BlogBuddy is a powerful VS Code extension that enhances your writing workflow with AI-powered features. Whether you're writing technical documentation, blog posts, or any markdown content, BlogBuddy provides intelligent text processing capabilities right in your editor.

## 🚀 Quick Start

1. **Install and Configure**: Set up your API key in VS Code settings
2. **Open a Markdown file**: BlogBuddy works best with `.md` files
3. **Use Commands**: Access features through the command palette or shortcuts
4. **Use BB Tags**: Embed special commands directly in your text

## 📋 Main Features Overview

BlogBuddy provides two ways to interact with AI:

### 1. Menu-Based Commands (Ctrl+Shift+B)
Access organized features through an interactive menu interface.

### 2. Inline BB Commands
Embed special tags directly in your text for instant AI processing.

---

## 🏷️ BB Command System

The BB command system allows you to embed AI instructions directly in your text using special tags. You can place commands on the same line as your content or on separate lines. Place your cursor anywhere in the text block (or select specific text) and press `Cmd+B Cmd+B` (Mac) or `Ctrl+B Ctrl+B` (Win/Linux) to execute.

**How it works:**
- **Text Block Mode**: When BB command is in the same text block (separated by blank lines) with other content, processes only that text block
- **Full Document Mode**: When BB command is alone on its own line with blank lines above and below (no other content in the text block), processes the entire document
- **Manual Selection**: When you manually select text, processes only the selected text regardless of mode

### Command Syntax
```
<command:optional-message>
```

### Available BB Commands

#### 1. `<bb-expd:additional-context>` - Text Expansion
**Purpose**: Expand and elaborate on existing content while preserving meaning
**Usage**: Place command in the same text block as content you want to expand
**Examples**:
```markdown
Machine learning is changing software development.
<bb-expd:make this suitable for a technical blog>

API design is important for scalability.
<bb-expd:add practical examples and use cases>
```
**Features**:
- Reads full document context for coherent expansion
- Maintains original tone and style
- Adds concrete examples and elaborative details
- Ensures natural integration with surrounding content

#### 2. `<bb-impv:style-instructions>` - Text Improvement
**Purpose**: Enhance clarity, grammar, and overall quality of text
**Usage**: Two distinct modes based on content selection
**Examples**:

**Text Block Mode (has content):**
```markdown
This paragraph has some repetitive content that says the same thing multiple times in different ways.
<bb-impv:make more concise and remove redundancy>

The API endpoint kinda works but sometimes it's slow.
<bb-impv:improve professional tone>
```

**Full Document Mode (command isolated by blank lines):**
```markdown
Some content above...

<bb-impv:improve the entire document's professional tone>

Some content below...

---

Other content above...

<bb-impv:enhance grammar and readability throughout the document>

Other content below...
```

**Behavior**:
- **Text Block Mode**: When BB command shares a text block with other content, improves only that text block in-place with document context
- **Full Document Mode**: When BB command is isolated by blank lines (alone in its text block), processes the entire document and creates a new file with `_improved` suffix

**Features**:
- Fixes grammar, spelling, and punctuation
- Enhances sentence structure and flow  
- Maintains author's voice and style
- Uses full document context for consistency

#### 3. `<bb-tslt:target-language>` - Translation
**Purpose**: Translate entire documents to specified languages
**Usage**: Requires target language specification
**Examples**:
```markdown
<bb-tslt:中文>
<bb-tslt:Japanese>
<bb-tslt:Français>
<bb-tslt:translate to Spanish>
```
**Features**:
- Translates entire document (not just selected text)
- Creates new file with language suffix
- Preserves markdown formatting and structure
- Handles code blocks appropriately
- Generates markdown link to translated version

#### 4. `<bb-mmd:diagram-instructions>` - Mermaid Diagrams
**Purpose**: Generate Mermaid diagrams by analyzing text content and converting it to visual representations
**Usage**: Place command in a text block that describes a process, workflow, or system structure
**Examples**:
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
**Features**:
- Analyzes text content to understand structure and relationships
- Automatically chooses appropriate diagram type (flowchart, sequence, class, state, ER, gantt, pie)
- Can output as code block or SVG image (configurable in settings)
- Validates generated Mermaid syntax using Kroki service
- Creates properly formatted, syntactically correct diagrams

#### 5. `<bb-kwd:keyword-focus>` - Keyword Extraction
**Purpose**: Extract SEO-friendly keywords from content
**Usage**: Analyzes document content to generate relevant keywords
**Examples**:
```markdown
<bb-kwd:focus on technical terms>
<bb-kwd:emphasize business keywords>
<bb-kwd:>  <!-- Uses default extraction -->
```
**Features**:
- Extracts 8-12 relevant keywords/phrases
- Includes primary keywords, long-tail phrases, and supporting terms
- Formats as organized, SEO-friendly list
- Analyzes full document context

#### 6. `<bb-tldr:summary-style>` - TL;DR Generation
**Purpose**: Generate concise summaries of content
**Usage**: Creates "too long; didn't read" summaries
**Examples**:
```markdown
<bb-tldr:focus on actionable insights>
<bb-tldr:technical summary>
<bb-tldr:>  <!-- Standard summary -->
```
**Features**:
- Generates 2-4 bullet points or 2-3 sentences maximum
- Focuses on essential points and key insights
- Creates self-contained, scannable summaries
- Analyzes full document content

#### 7. `<bb-tag>` - BB Badge
**Purpose**: Add BlogBuddy attribution badge
**Usage**: Simple tag insertion
**Example**:
```markdown
<bb-tag>
```
**Output**: `[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)`

#### 8. `<bb:your-instruction>` - General AI Tasks ⚠️
**Purpose**: Execute any AI task with custom instructions
**Usage**: Two distinct modes based on content selection

> **⚠️ Important Notice**: This is the most powerful and flexible command. Due to the complexity and open-ended nature of tasks, it may require higher-performance AI models and could result in significantly higher token usage and costs compared to other specialized commands. Use judiciously for tasks that cannot be accomplished with the specific commands above.

**Examples**:

**Text Block Mode (has content):**
```markdown
This is some casual text that needs improvement.
<bb:rewrite this in a more professional tone>

AI is useful for many tasks.
<bb:add examples and make it more detailed>

- Feature 1: Description
- Feature 2: Description
<bb:convert this list to a table format>
```

**Full Document Mode (command isolated by blank lines):**
```markdown
Some previous content here.

<bb:rewrite the entire document in a more professional tone>

Some following content here.

---

Other content above...

<bb:convert all lists in this document to table format>

Other content below...
```

**Behavior**:
- **Text Block Mode**: When BB command shares a text block with other content, processes only that text block in-place
- **Full Document Mode**: When BB command is isolated by blank lines (alone in its text block), processes the entire document and creates a new file with `_processed` suffix

**Performance Considerations**:
- May require more powerful AI models for complex instructions
- Can consume significantly more tokens than specialized commands
- Processing time may be longer for complex tasks
- Consider using specific commands (expd, impv, tslt, etc.) when possible for better efficiency

---

## 🎛️ Menu System (Ctrl+Shift+B)

Access organized features through an interactive menu:

### Usage Statistics
- View AI usage metrics by feature
- Track token consumption and request counts
- Reset statistics when needed
- Export detailed usage reports

### Help Information
- Access this comprehensive help documentation
- View in editor or as notification
- Always up-to-date feature reference

---

## ⚙️ Configuration

### Required Settings
1. **API Key** (`blogbuddy.apiKey`): Your AI service API key
2. **Base URL** (`blogbuddy.baseURL`): AI service endpoint (default: `https://openrouter.ai/api/v1`)
3. **Model** (`blogbuddy.model`): AI model to use (default: `openai/gpt-5-mini`)

### Optional Settings
- **Mermaid Code** (`blogbuddy.mermaidCode`): Choose output format for Mermaid diagrams
  - `false` (default): Creates SVG image files with ![image](file.svg) references
  - `true`: Generates code blocks (```mermaid```) that render inline in Markdown viewers

### Configuration Access
- Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
- Search for "Blog Buddy" or "blogbuddy"
- Configure the four available settings:
  - `blogbuddy.apiKey`
  - `blogbuddy.baseURL`
  - `blogbuddy.model`
  - `blogbuddy.mermaidCode`

---

## 💡 Pro Tips

### Best Practices
1. **Master Blank Line Control**: Blank lines determine processing scope
   - **Same text block** (no blank lines): Processes only that content
   - **Isolated by blank lines**: Processes entire document
2. **Choose Your Mode**:
   - For local edits: Place commands with content in the same text block (no blank lines between)
   - For full document processing: Isolate commands with blank lines above and below
3. **Context Matters**: BB commands read your entire document for better context
4. **Be Specific**: Provide clear instructions in command messages
5. **File Types**: Works best with Markdown (.md) files
6. **Backup Important Work**: BB creates new files for document-level operations

### Workflow Integration
1. **Draft First**: Write your initial content, then enhance with BB commands
2. **Iterative Improvement**: Use multiple commands for progressive enhancement
3. **Review Output**: Always review AI-generated content before finalizing
4. **Combine Features**: Use expansion → improvement → translation workflows

### Command Combinations

**Text Block Mode (local processing):**
```markdown
Your initial paragraph here.
<bb-expd:add technical details>

After expansion, this content needs polishing.
<bb-impv:make more professional>
```

**Full Document Mode (document-wide processing):**
```markdown
Some content here...

<bb-impv:improve grammar and readability throughout the entire document>

More content here...

<bb-kwd:focus on technical SEO terms>

Final content here...
```

---

## 🔧 Shortcuts & Commands

| Action | Shortcut | Command |
|--------|----------|---------|
| Execute BB Command | `Cmd+B Cmd+B` (Mac)<br>`Ctrl+B Ctrl+B` (Win/Linux) | `blogbuddy.bb` |
| Open Main Menu | `Cmd+Shift+B` (Mac)<br>`Ctrl+Shift+B` (Win/Linux) | `blogbuddy.menu` |
| View Usage Stats | Menu → Usage Statistics | N/A |
| Open Help | Menu → Help Information | N/A |

---

## ❓ Troubleshooting

### Common Issues

**🔴 "API Key not configured"**
- Solution: Set API key in VS Code settings under BlogBuddy section

**🔴 "BB don't know cmd: [command]"**
- Solution: Check command syntax, ensure using supported BB commands

**🔴 "Translation requires target language"**
- Solution: Specify target language in translation command (e.g., `<bb-tslt:Spanish>`)

**🔴 "File reading failed"**
- Solution: Ensure file is saved and is a supported type (.md, .txt)

**🔴 Generated content seems off-topic**
- Solution: Be more specific in command instructions, check document context

### Performance Tips
- Save files before processing for better context
- Use specific instructions rather than generic commands
- For large documents, consider processing sections individually
- Monitor token usage through the statistics menu

### Getting Support
- Check VS Code developer console for detailed error messages
- Review extension logs in Output panel
- Ensure stable internet connection for AI services
- Verify file permissions for document-level operations

---

## 🔄 Version History & Updates

BlogBuddy is actively developed with regular updates. New features and improvements are added based on user feedback and AI technology advances.

### Recent Enhancements
- Enhanced context awareness for better AI responses
- Improved error handling and user feedback
- Expanded Mermaid diagram support
- Better translation quality with language inference

---

*Made with ❤️ for productive writing workflows*