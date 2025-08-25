# BlogBuddy Development Guidelines for Claude

## Project Identity & Mission
This is a VS Code extension that provides seamless AI assistance through embedded command tags in content. The core philosophy is maintaining user flow without context switching.

## Core Architecture Principles

### 1. Layered Architecture (3-Tier Design)
```
┌─────────────────┐
│   Commands      │ ← View Layer: VS Code Integration & UI
├─────────────────┤
│   Core          │ ← Business Layer: BB Features & Logic  
├─────────────────┤
│ Services/Utils  │ ← Foundation Layer: Infrastructure & Support
└─────────────────┘
```

**Layer Responsibilities:**

**Commands (View Layer)**
- Handle VS Code extension lifecycle and events
- Parse user selections and extract command tags
- Manage editor interactions (text replacement, progress indicators)
- Handle keyboard shortcuts and menu commands
- Present results and errors to users
- **Never contain business logic** - only orchestrate core features

**Core (Business Layer)**  
- Implement feature processors for various AI operations
- Define business interfaces for request/response patterns
- Contain all AI prompt engineering and response processing
- Enforce business rules and validation
- **Stateless processors** that transform requests to responses

**Services/Utils (Foundation Layer)**
- Provide infrastructure capabilities (AI proxy, configuration, external rendering)
- Handle cross-cutting concerns (error handling, resource locking)
- Manage external integrations (AI providers, third-party services, platform settings)
- Offer utility functions used across all layers
- **No business logic** - pure technical services

### 2. SOLID Principles & Design Philosophy

**Single Responsibility Principle (SRP)**
- Each class/module has one reason to change
- Core processors focus solely on their specific feature
- Services handle only one type of integration
- Commands manage only UI concerns for their specific action

**Open/Closed Principle (OCP)**  
- Extend functionality through new processors, not modifications
- Use interfaces for request/response patterns to allow new implementations
- Configuration-driven behavior over hard-coded logic

**Liskov Substitution Principle (LSP)**
- All core processors are interchangeable through common interface
- Different AI providers work through same AIProxy interface
- Error handling is consistent across all components

**Interface Segregation Principle (ISP)**
- Small, focused interfaces over large monolithic ones
- Separate concerns: configuration, AI processing, error handling
- Clients depend only on interfaces they use

**Dependency Inversion Principle (DIP)**
- Depend on abstractions (interfaces) not concretions
- Core processors depend on AIProxy interface, not specific implementation
- Services are injected via singletons, not directly instantiated

**Occam's Razor Principle**
- ✅ **Prefer simplicity**: Choose the simplest solution that works
- ✅ **Minimize complexity**: Avoid over-engineering and premature optimization
- ✅ **Single purpose**: Each function/class should do one thing well
- ✅ **Easy to test**: Simple, focused code is inherently testable
- ✅ **Easy to understand**: Code should be self-documenting through clarity

### 3. Interface Consistency
Every core processor implements the same pattern:
```typescript
interface Processor {
    process(request: ProcessRequest): Promise<ProcessResponse>
}
```

### 4. Singleton Pattern for Shared Resources
Use singleton pattern consistently for:
- BB (main controller)
- ConfigService
- AIProxy
- DocumentLockManager

## Development Standards

### TypeScript Excellence
- **Always define interfaces before implementation**
- Use enums for command types and configuration keys
- Leverage union types and type guards for robust parsing
- Never use `any` - prefer `unknown` with proper type checking

### Error Handling Philosophy
- **Centralized error handling**: Always use AppError and ErrorHandler
- **User-friendly messages**: Errors should guide users to solutions
- **Graceful degradation**: Never crash the extension
- **Specific error codes**: Use ErrorCode enum for different failure types

### AI Integration Patterns
- **Single point of truth**: All AI calls go through aiProxy
- **Usage tracking**: Always track requests and tokens
- **Configuration flexibility**: Support different models and providers
- **Retry logic**: Handle network failures gracefully

### Command Processing Workflow
When adding new commands, follow this exact pattern:

1. **Define in command enum** (core layer)
2. **Create processor class** (core layer)
3. **Implement unified interface** (process method)
4. **Add to main controller dispatch** (core layer)
5. **Update documentation** as needed

### Configuration Management
- **Reactive configuration**: Use ConfigWatcher for live updates
- **Type-safe access**: Always use ConfigKey enum
- **Validation**: Validate configuration before use
- **Default values**: Provide sensible defaults for all settings

## Code Patterns & Best Practices

### File Organization
```
src/
├── commands/          # View Layer: Platform integration & UI handling
├── core/             # Business Layer: Feature processors & logic
├── services/         # Foundation Layer: Infrastructure services
└── utils/            # Foundation Layer: Cross-cutting utilities
```

### Naming Conventions
- **Commands**: `registerXxxCommand()`, `handleXxx()`
- **Processors**: `XxxProcessor` class, `process()` method
- **Services**: `XxxService` class, descriptive method names
- **Utils**: Functional approach, `doSomething()` format

### Async Handling
- **Always use async/await** instead of Promises
- **Proper error propagation** through try/catch blocks
- **Document lock management** for concurrent operations
- **Timeout handling** for AI requests

### Platform Integration
- **Resource management**: Always register disposables
- **Editor state management**: Handle document changes safely
- **User feedback**: Use progress indicators for long operations
- **Shortcuts**: Maintain consistency with platform conventions

## Architectural Boundaries & Rules

### Layer Interaction Rules
```
Commands ↔ Core ↔ Services/Utils
   ↓                    ↑
Services/Utils ←--------┘
```

**Commands Layer Rules:**
- ✅ **CAN**: Call core processors, access services directly for UI needs
- ✅ **CAN**: Handle platform events, manage editor state, show progress
- ❌ **CANNOT**: Contain AI prompts, business validation, or feature logic
- ❌ **CANNOT**: Directly call external APIs or handle complex responses

**Core Layer Rules:**
- ✅ **CAN**: Use services/utils, contain business logic and AI prompts
- ✅ **CAN**: Validate inputs, process external responses, apply business rules
- ❌ **CANNOT**: Access platform APIs directly (except for basic types)
- ❌ **CANNOT**: Handle UI concerns like progress or notifications

**Services/Utils Layer Rules:**
- ✅ **CAN**: Integrate with external APIs, manage configuration, provide utilities
- ✅ **CAN**: Handle technical concerns like caching, retries, logging
- ❌ **CANNOT**: Contain business logic or feature-specific behavior
- ❌ **CANNOT**: Know about command types or application-specific workflows

### Data Flow Principles
1. **Downward dependency only**: Upper layers depend on lower layers
2. **Interface segregation**: Core defines its own interfaces for requests and responses
3. **Dependency injection**: Services are injected/accessed via singletons
4. **Event-driven UI**: Commands react to platform events, delegate to Core

## Development Process & Methodology

### 🚫 **CRITICAL: Think Before You Code**

**For Complex Development Tasks (multiple files, new features, architectural changes):**

❌ **DO NOT** immediately start writing code  
✅ **DO** follow the analysis-first approach:

#### Step 1: Analysis Phase
- **Understand the requirements** completely
- **Identify affected layers** and components  
- **Review existing patterns** and similar implementations
- **Consider architectural impact** and SOLID principles
- **Evaluate complexity** and potential edge cases

#### Step 2: Design Phase  
Output a structured design plan including:
```markdown
## Design Analysis
- **Scope**: What needs to be built/changed
- **Architecture**: Which layers are involved
- **Components**: New classes, interfaces, modifications needed
- **Data flow**: How information moves through the system
- **Integration points**: Dependencies and service interactions
- **Testing strategy**: How to verify the implementation

## Implementation Plan
1. **Phase 1**: Foundation (interfaces, types, basic structure)  
2. **Phase 2**: Core logic (business rules, processing)
3. **Phase 3**: Integration (services, error handling)
4. **Phase 4**: UI layer (commands, user experience)
5. **Phase 5**: Testing and validation

## Trade-offs & Considerations
- **Alternatives considered**: Other approaches and why they were rejected
- **Potential risks**: What could go wrong
- **Future extensibility**: How this fits into long-term architecture
```

#### Step 3: Discussion & Confirmation
- **Present the design** to the user for review
- **Explain the rationale** behind key decisions
- **Discuss alternatives** and trade-offs
- **Confirm the approach** before proceeding
- **Adjust based on feedback** if needed

#### Step 4: Implementation
Only after confirmation:
- Follow the agreed implementation plan
- Implement in phases as designed
- Test each phase before proceeding
- Maintain adherence to SOLID principles

### Simple Tasks Exception
For simple, single-file modifications or bug fixes:
- Brief analysis is acceptable
- Can proceed directly to implementation
- Still follow SOLID principles and existing patterns

## Development Guidelines

### When Adding New Features

1. **Analyze the request**: Determine which layer(s) are affected
2. **Follow existing patterns**: Look at similar implementations first
3. **Maintain architectural consistency**: Don't break the layer boundaries
4. **Test thoroughly**: Verify with different AI models and configurations
5. **Update documentation**: Keep user guides and dev docs in sync

### When Modifying Existing Code

1. **Understand the data flow**: Trace from command to response
2. **Check all integration points**: Services, error handling, configuration
3. **Maintain backward compatibility**: Don't break existing command tags
4. **Test edge cases**: Empty inputs, network failures, configuration errors
5. **Verify lock behavior**: Ensure no concurrent processing issues

### When Debugging Issues

1. **Check configuration first**: API key, model, base URL validity
2. **Verify command parsing**: Ensure tags are extracted correctly
3. **Trace AI interactions**: Use aiProxy logging and statistics
4. **Review error handling**: Check ErrorHandler integration
5. **Test document locking**: Verify no race conditions

## AI Integration Best Practices

### Prompt Engineering
- **Context-aware prompts**: Include document context when relevant
- **Clear instructions**: Specify output format requirements
- **Consistent tone**: Match user's writing style
- **Error recovery**: Handle malformed AI responses gracefully

### Model Management
- **Provider flexibility**: Support multiple AI providers through unified interface
- **Model selection**: Allow users to choose appropriate models
- **Usage optimization**: Track and report resource usage
- **Rate limiting**: Handle API limits gracefully

## Testing Strategy

### Unit Testing Focus Areas
- Command parsing logic
- Error handling scenarios
- Configuration management
- AI response processing

### Integration Testing
- End-to-end command workflows
- Configuration changes
- Document locking behavior
- Error recovery paths

## Security Considerations

- **Credential management**: Store securely in platform settings
- **Input validation**: Sanitize all user inputs
- **Network security**: Use HTTPS for all external communications
- **Privacy**: Never log sensitive user content

## Performance Guidelines

- **Lazy loading**: Initialize services only when needed
- **Caching**: Cache AI responses when appropriate
- **Debouncing**: Prevent rapid-fire command execution
- **Memory management**: Dispose resources properly

## Extension Lifecycle

### Activation
- Register commands immediately
- Initialize configuration watcher
- Prepare services for first use

### Runtime
- Handle configuration changes dynamically
- Manage document locks carefully
- Provide user feedback for long operations

### Deactivation
- Clean up all resources
- Cancel pending operations
- Save usage statistics if needed

## Common Patterns to Follow

### Adding a New Command Type
```typescript
// 1. Add to enum
enum CommandType {
    NEW_FEATURE = 'cmd-nf'
}

// 2. Create processor
export class NewFeatureProcessor {
    async process(request: ProcessRequest): Promise<ProcessResponse> {
        // Implementation
    }
}

// 3. Update main controller
case CommandType.NEW_FEATURE:
    return await this.handleNewFeature(request);
```

### Error Handling Pattern
```typescript
try {
    const result = await riskyOperation();
    return { replaceText: result };
} catch (error) {
    throw new AppError(
        ErrorCode.PROCESSING_FAILED,
        `Operation failed: ${error.message}`,
        error
    );
}
```

### Service Integration Pattern
```typescript
const config = ConfigService.getInstance().getAllConfig();
const aiResponse = await AIProxy.getInstance().chat(messages, config.model);
```

Remember: The application's strength lies in seamless integration and consistent user experience. Every change should enhance the core workflow while maintaining architectural integrity.

## File Creation Guidelines

### 🚫 **CRITICAL: Do NOT Create Unnecessary Files**

**Prohibited File Types:**
- ❌ **NEVER create example files**: Do not create files like `xxx.example.ts`, `xxx.demo.ts`, `example.ts`, etc.
- ❌ **NEVER create test documentation**: Do not create files like `xxx.test.md`, `test-guide.md`, `usage.md`, etc.
- ❌ **NEVER create documentation proactively**: Only create documentation files if explicitly requested by the user

**Why These Rules Exist:**
- **Code Bloat**: Example files clutter the codebase without providing real functionality
- **Maintenance Burden**: Additional files require ongoing maintenance and can become outdated
- **Confusion**: Example files can confuse developers about which files contain actual implementation
- **Repository Pollution**: Test documentation files add unnecessary noise to the codebase

**What to Do Instead:**
- **For Examples**: Include usage examples in code comments or existing documentation
- **For Testing**: Create functional code that can be tested through normal usage
- **For Documentation**: Only create when explicitly requested by the user

**Acceptable File Creation:**
- ✅ Core implementation files (actual features)
- ✅ Configuration files when necessary for functionality  
- ✅ Types and interfaces that are actually used
- ✅ Documentation files when explicitly requested by the user

**Before Creating Any File:**
1. Ask yourself: "Is this file absolutely necessary for the functionality?"
2. Consider: "Can this information be included in existing files or comments?"
3. Verify: "Did the user explicitly request this file?"

**Exception:**
Only create example or test files if the user explicitly requests them with clear statements like "create an example file" or "make a test document".