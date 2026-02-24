# BlogBuddy Development Guidelines for Claude

## Project Identity & Mission
This is a VS Code extension that provides seamless AI assistance through embedded command tags in content. The core philosophy is maintaining user flow without context switching.

## Core Architecture

### 3-Layer Architecture
```
┌─────────────────┐
│   Commands      │ ← View Layer: VS Code Integration & UI
├─────────────────┤
│   Core          │ ← Business Layer: Features & Logic  
├─────────────────┤
│ Services/Utils  │ ← Foundation Layer: Infrastructure
└─────────────────┘
```

**Layer Responsibilities:**

- **Commands Layer**: Handle VS Code integration, UI interactions, and user events. Never contain business logic.
- **Core Layer**: Implement feature processing, AI operations, and business rules. Transform requests to responses.
- **Services/Utils Layer**: Provide infrastructure services, external integrations, and utility functions.

### File Organization
```
src/
├── commands/          # View Layer: Platform integration & UI
│   ├── editorCommand.ts   # BB Editor webview panel lifecycle & HTML
│   └── ...
├── core/             # Business Layer: Feature processors
├── services/         # Foundation Layer: Infrastructure
│   ├── WebviewBridge.ts     # Webview ↔ Extension Host message routing
│   └── webviewProtocol.ts   # Typed message protocol definitions
└── utils/            # Foundation Layer: Utilities

media/webview/         # Webview frontend (browser, bundled separately)
├── index.ts              # Milkdown editor init, message handling, URI conversion
├── ai-block-plugin.ts    # ProseMirror node for AI streaming blocks
├── bb-slash-plugin.ts    # Slash menu for BB commands
└── styles.css            # Editor styles
```

### Layer Interaction Rules
- **Commands**: Can call Core and Services, handles UI concerns only
- **Core**: Can use Services/Utils, contains business logic and AI prompts
- **Services/Utils**: Pure technical services, no business logic

### BB Editor (Webview) Architecture

The BB Editor is a WYSIWYG Markdown editor running inside a VS Code webview panel.

**Dual build system** (`esbuild.js`):

- Extension host: Node.js CJS → `dist/extension.js`
- Webview: Browser IIFE → `dist/webview.js` + `dist/webview.css`

**Message flow** (typed in `webviewProtocol.ts`):

```text
Webview (browser)              Extension Host (Node.js)
  index.ts                       WebviewBridge.ts
    │                                │
    │── bb-request ────────────────→ │ → BB.act() / actStreaming()
    │← chunk / done / error ───────│
    │                                │
    │── file-upload (base64) ──────→ │ → fs.writeFile() → webviewUri
    │← file-uploaded ──────────────│
    │                                │
    │── save / auto-save ──────────→ │ → reattach frontmatter → fs.writeFile()
    │← saved ──────────────────────│
    │                                │
    │← load (content + baseUri) ───│   (frontmatter stripped)
```

**Key patterns**:

- **Frontmatter handling**: `extractFrontmatter()` strips YAML/TOML on load, `storedFrontmatter` is reattached on save/auto-save
- **Image/file upload**: Files sent as base64 to host, saved to disk, webview URI returned; `preprocessMarkdown`/`postprocessMarkdown` convert between relative paths and webview URIs
- **AI blocks**: Custom ProseMirror node (`ai_block`) displays streaming AI responses inline

## Development Principles

### Design Philosophy
- **Simplicity First**: Choose the simplest solution that works
- **Single Responsibility**: Each module has one clear purpose
- **Interface Consistency**: Use common patterns across similar components
- **Dependency Direction**: Upper layers depend on lower layers only

### Code Standards
- Always define interfaces before implementation
- Use TypeScript strictly - avoid `any`, prefer `unknown` with type checking
- Centralized error handling with user-friendly messages
- All AI calls go through a single proxy service
- Configuration should be reactive and type-safe

### Development Workflow

**For Complex Tasks:**
1. **Analyze**: Understand requirements and identify affected layers
2. **Design**: Plan the implementation approach and data flow
3. **Confirm**: Discuss the approach before proceeding
4. **Implement**: Follow the agreed plan in phases
5. **Test**: Verify with different configurations and edge cases

**For Simple Tasks:**
- Brief analysis is acceptable
- Can proceed directly to implementation
- Still follow existing patterns and principles

## Best Practices

### AI Integration
- Support multiple AI providers through unified interface
- Include appropriate context in prompts
- Handle network failures and rate limits gracefully
- Track usage and provide user feedback

### Extension Development
- Register all disposables properly
- Use progress indicators for long operations
- Handle document changes safely
- Maintain consistency with platform conventions

### Error Handling
- Never crash the extension - graceful degradation
- Provide actionable error messages
- Use consistent error handling patterns
- Validate inputs before processing

## File Creation Guidelines

### 🚫 **Do NOT Create Unnecessary Files**

**Prohibited:**
- Example/demo files (`xxx.example.ts`, `example.ts`)
- Test documentation files (`xxx.test.md`, `test-guide.md`)
- Documentation files (unless explicitly requested)

**Why:**
- Code bloat and maintenance burden
- Confusion about actual implementation
- Repository pollution

**Acceptable:**
- ✅ Core implementation files (actual features)
- ✅ Configuration files when necessary
- ✅ Types and interfaces that are used
- ✅ Documentation when explicitly requested

**Before Creating Any File:**
1. Is this absolutely necessary for functionality?
2. Can this be included in existing files?
3. Did the user explicitly request this?

Remember: The application's strength lies in seamless integration and consistent user experience. Every change should enhance the core workflow while maintaining architectural integrity.