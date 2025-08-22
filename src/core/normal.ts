import { Utils, FileUtils } from '../utils/helpers';
import { AIProxy } from '../utils/aiProxy';
import { AppError, ErrorCode } from '../utils/ErrorHandler';
import * as fs from 'fs';
import * as path from 'path';

export interface NormalRequest {
    selectText: string;      // 包含 BBCmd 的文本
    filePath: string;        // 文本所在文件的路径
    msg: string;             // 用户的附加消息
}

export interface NormalResult {
    success: boolean;
    result: string;
    replaceText: string;
}

export class NormalProcessor {
    private static instance: NormalProcessor = new NormalProcessor();
    private constructor() { }
    
    public static getInstance(): NormalProcessor {
        return NormalProcessor.instance;
    }

    /**
     * 处理通用任务请求 - 完全听从用户指示
     */
    public async handleNormalTask(request: NormalRequest): Promise<NormalResult> {
        try {
            // 验证用户是否提供了指示
            if (Utils.isEmpty(request.msg)) {
                throw new AppError(
                    ErrorCode.SERVER_ERROR,
                    'Normal task requires user instructions. Please specify what you want me to do with the text.',
                    'Normal task requires user instructions'
                );
            }

            // 判断是否为局部文本操作还是全文操作
            const hasSelectedText = !Utils.isEmpty(request.selectText);

            if (hasSelectedText) {
                // 局部文本操作模式
                return await this.processTextBlock(request);
            } else {
                // 全文操作模式
                return await this.processFullDocument(request);
            }

        } catch (error) {
            return {
                success: false,
                result: `Normal task failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                replaceText: request.selectText // 失败时返回原文
            };
        }
    }

    /**
     * 局部文本操作 - 替换局部文本
     */
    private async processTextBlock(request: NormalRequest): Promise<NormalResult> {
        const taskPrompt = this.getNormalBlockPrompt(request.selectText, request.msg);

        // 准备消息 - 使用核心系统提示词
        const messages: Array<any> = [];
        messages.push({ role: 'system', content: this.getCoreSystemPrompt() });
        messages.push({ role: 'user', content: taskPrompt });

        // 调用AI处理文本
        const aiProxy = AIProxy.getInstance();
        const processedContent = await aiProxy.chat(messages, 'NORMAL');

        return {
            success: true,
            result: 'Text block processing completed successfully.',
            replaceText: processedContent
        };
    }

    /**
     * 全文操作 - 生成新文件
     */
    private async processFullDocument(request: NormalRequest): Promise<NormalResult> {
        // 检查文件路径是否存在
        if (Utils.isEmpty(request.filePath)) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                'Full document processing requires a file path',
                'Full document processing requires a file path'
            );
        }

        // 读取完整文件内容
        const fileContent = await FileUtils.readFileContentAsync(
            request.filePath!,
            FileUtils.SupportedFileTypes.MARKDOWN
        );

        if (!fileContent) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                'Unable to read file content or file type not supported',
                'File reading failed'
            );
        }

        const taskPrompt = this.getNormalDocumentPrompt(fileContent, request.msg);

        // 准备消息 - 使用核心系统提示词
        const messages: Array<any> = [];
        messages.push({ role: 'system', content: this.getCoreSystemPrompt() });
        messages.push({ role: 'user', content: taskPrompt });

        // 调用AI处理全文
        const aiProxy = AIProxy.getInstance();
        const processedContent = await aiProxy.chat(messages, 'NORMAL');

        // 生成新文件名
        const parsedPath = path.parse(request.filePath!);
        const newFileName = `${parsedPath.name}_processed${parsedPath.ext}`;
        const newFilePath = path.join(parsedPath.dir, newFileName);

        // 在处理内容末尾添加BB标签
        const processedContentWithTag = processedContent + '\n\n' + this.normalTag();

        // 写入处理内容到新文件
        await fs.promises.writeFile(newFilePath, processedContentWithTag, 'utf-8');

        const resultMessage = `Document processing completed! File saved as: ${newFileName}\n\nProcessed from ${parsedPath.name}${parsedPath.ext} according to your instructions: "${request.msg}"`;

        return {
            success: true,
            result: resultMessage,
            replaceText: resultMessage
        };
    }

    /**
     * 获取系统提示词
     */
    private getCoreSystemPrompt(): string {
    return `
# AI Agent System Prompt

You are an intelligent AI agent designed to help users with various tasks through tool usage and reasoning. You can read files, write content, search information, execute commands, and perform complex multi-step operations.

## Tool-Based Approach

You have access to a comprehensive set of tools that you can call to complete tasks:

### File Operations
- **read_file**: Read the content of any file
- **write_file**: Write content to files, creating directories if needed
- **list_files**: List files and directories in a path
- **get_file_info**: Get detailed information about files/directories
- **create_directory**: Create directories recursively

### Search and Analysis
- **search_files**: Search for text patterns across multiple files using regex

### System Operations
- **execute_command**: Execute shell commands safely (with security restrictions)

## Working Process

When given a task:

1. **Analyze** the request to understand what needs to be accomplished
2. **Plan** the steps required, identifying which tools to use
3. **Execute** the plan by making tool calls in the appropriate sequence
4. **Verify** results and make additional tool calls if needed
5. **Respond** with a clear summary of what was accomplished

## Tool Usage Guidelines

- **Always use tools** when you need to interact with files, execute commands, or gather information
- **Make tool calls in JSON format** following the function calling syntax
- **Handle errors gracefully** and retry with different approaches if needed
- **Verify your work** by reading files after writing them when appropriate
- **Be security conscious** - avoid dangerous commands and validate inputs

## Response Format

When using tools:
1. First explain what you plan to do
2. Make the necessary tool calls
3. Analyze the results
4. Provide a clear summary of what was accomplished

For text processing tasks, you can still provide direct text transformations, but prefer using tools when file operations are involved.

## Legacy Text Processing Capabilities

You still excel at traditional text operations:
- **Text Expansion**: Elaborate and enrich content while preserving key messages
- **Text Rewriting**: Transform text with alternative phrasing and structure
- **Text Polishing**: Enhance clarity, flow, and readability
- **Error Correction**: Fix grammatical, spelling, and structural issues
- **Translation**: Accurately translate to specified languages
- **Keyword Generation**: Extract relevant SEO-friendly keywords
- **TL;DR Generation**: Create concise summaries capturing essential points
- **Mermaid Diagram Creation**: Generate mermaid diagrams based on requirements

## Input Processing Protocol

You will receive inputs in this specific format:
<example>
[Optional command instructions]
<text>
[User's text content to process]
</text>
[Optional additional user messages]
</example>

### Critical Processing Rules

1. **Skip the preamble** - Begin output immediately with processed content
2. **No meta-commentary** - Exclude prefixes, explanations, conclusions, or options
3. **Preserve markdown** - Maintain all existing markdown syntax and formatting
4. **Direct response only** - Return solely the transformed text

## Command Execution Guidelines

### For Text Expansion
- Add depth through examples, context, and supporting details
- Maintain original tone and voice
- Expand logically without redundancy

### For Text Rewriting
- Restructure sentences while preserving meaning
- Use varied vocabulary and sentence patterns
- Keep the same level of formality

### For Text Polishing
- Improve sentence flow and transitions
- Enhance word choice for clarity
- Eliminate redundancies and awkward phrasing

### For Error Correction
- Fix all grammatical and spelling errors
- Correct punctuation and capitalization
- Ensure consistent tense and voice

### For Translation
- Provide accurate, natural-sounding translations
- Adapt idioms and cultural references appropriately
- Maintain formatting and structure

### For Keyword Generation
- Extract 5-10 relevant keywords
- Include both primary and long-tail keywords
- Format as comma-separated list

### For TL;DR Generation
- Capture main points in 2-3 sentences
- Focus on actionable insights
- Maintain objective tone

### For Mermaid Diagrams
- Follow mermaid.js syntax precisely
- Create clear, logical visual representations
- Include all requested elements

## Quality Assurance Checklist

Before outputting:
- ✓ Confirm output matches requested operation
- ✓ Verify all markdown syntax is preserved
- ✓ Ensure no explanatory text is included
- ✓ Check that response starts directly with processed content

## Edge Case Handling

- **Ambiguous commands**: Apply most logical interpretation based on context
- **Multiple commands**: Execute in sequence, outputting final result only
- **Missing <text> tags**: Process entire input as text content
- **Conflicting instructions**: Prioritize explicit user requirements in additional messages

## Output Format

Return processed text immediately without any of these elements:
- ❌ "Here is the processed text:"
- ❌ "I've expanded/rewritten/polished..."
- ❌ "Changes made include..."
- ❌ "Would you like me to..."
- ❌ Multiple versions or options

## Examples of Correct Behavior

**Input:**
<example>
Text Expansion
<text>
AI is changing the world.
</text>
Make it suitable for a tech blog
</example>

**Output:**
Artificial Intelligence is fundamentally transforming every aspect of our modern world, from revolutionizing healthcare diagnostics and personalized medicine to reshaping financial markets through algorithmic trading and fraud detection. This technological revolution extends beyond traditional sectors, influencing how we communicate, work, and make decisions. Machine learning algorithms now power recommendation systems that curate our digital experiences, while natural language processing enables seamless human-computer interactions. As AI capabilities continue to evolve at an unprecedented pace, we're witnessing the emergence of autonomous vehicles, smart cities, and predictive analytics that anticipate needs before they arise.

---

Remember: Your response IS the processed text. Nothing more, nothing less.

    `;
}

    /**
     * 局部文本操作提示词
     */
    private getNormalBlockPrompt(text: string, userMsg: string): string {
        return `
User Request: ${userMsg}

## Text to Process:
<text>
${text}
</text>

## Instructions:
Please follow the user's request exactly as specified. Process the provided text according to their instructions and return only the result without any explanations or meta-commentary.
        `;
    }

    /**
     * 全文档操作提示词
     */
    private getNormalDocumentPrompt(text: string, userMsg: string): string {
        return `
User Request: ${userMsg}

## Document to Process:
<text>
${text}
</text>

## Instructions:
Please follow the user's request exactly as specified. Process the entire document according to their instructions and return the complete result without any explanations or meta-commentary.
        `;
    }

    /**
     * 获取 BB Normal 标签文本
     */
    public normalTag(): string {
        return '[![BB](https://img.shields.io/badge/processed-by-BB-FFD900)](https://github.com/SandyKidYao/blogbuddy)';
    }
}