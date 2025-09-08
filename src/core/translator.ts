import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { Utils, FileUtils } from '../utils/helpers';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { AIService } from '../services/AIService';
import { ConfigService } from '../services/ConfigService';
import { ProcessChunk, ProcessRequest, ProcessResponse, StreamingProcessor } from './types';
import * as fs from 'fs';
import * as path from 'path';



export class Translator implements StreamingProcessor {
    private static instance: Translator = new Translator();
    private constructor() { }


    public static getInstance(): Translator {
        return Translator.instance;
    }

    public async processStreaming(request: ProcessRequest): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        // 判断是否为文本块翻译还是全文翻译
        const hasSelectedText = !Utils.isEmpty(request.selectText);

        if (hasSelectedText) {
            // 文本块翻译模式 - 使用真正的流式处理
            return this.translateTextBlockStreaming(request);
        } else {
            // 全文翻译模式 - 使用模拟流式处理
            return this.translateFullDocumentStreaming(request);
        }
    }

    /**
     * 处理翻译请求 - 支持文本块和全文翻译
     */
    public async process(request: ProcessRequest): Promise<ProcessResponse> {
        // 判断是否为文本块翻译还是全文翻译
        const hasSelectedText = !Utils.isEmpty(request.selectText);

        if (hasSelectedText) {
            // 文本块翻译模式
            return await this.translateTextBlock(request);
        } else {
            // 全文翻译模式
            return await this.translateFullDocument(request);
        }
    }

    /**
     * 文本块翻译 - 类似 Expand 模式
     */
    private async translateTextBlock(request: ProcessRequest): Promise<ProcessResponse> {
        // 检查用户是否提供了目标语言
        if (Utils.isEmpty(request.msg)) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                'Translation requires target language. Please specify the language in your message (e.g., "English", "中文", "日本語")',
                'Translation requires target language specification',
            );
        }

        // 获取全文上下文
        const fileContext = await this.getFileContext(request.filePath);
        
        // 先从用户消息中推断目标语言
        const inferredLanguage = await this.inferTargetLanguage(request.msg);

        const completePrompt = this.generateCompleteTranslatePrompt(request.selectText, request.msg, 'block', inferredLanguage, fileContext);

        // 准备消息
        const messages: Array<ChatCompletionMessageParam> = [];
        messages.push({ role: 'user', content: completePrompt });

        // 调用AI进行文本翻译
        const aiService = AIService.getInstance();
        const config = ConfigService.getInstance().getAllConfig();
        const translatedContent = await aiService.chat(messages, 'TRANSLATE', config.smallModel);

        return {
            replaceText: translatedContent
        };
    }

    /**
     * 文本块流式翻译 - 类似 Expander 模式（真正的流式处理）
     */
    private async translateTextBlockStreaming(
        request: ProcessRequest
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: Translator): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            // 检查用户是否提供了目标语言
            if (Utils.isEmpty(request.msg)) {
                throw new AppError(
                    ErrorCode.SERVER_ERROR,
                    'Translation requires target language. Please specify the language in your message (e.g., "English", "中文", "日本語")',
                    'Translation requires target language specification',
                );
            }

            // 获取全文上下文
            const fileContext = await this.getFileContext(request.filePath);
            
            // 先从用户消息中推断目标语言
            const inferredLanguage = await this.inferTargetLanguage(request.msg);

            const completePrompt = this.generateCompleteTranslatePrompt(request.selectText, request.msg, 'block', inferredLanguage, fileContext);

            const messages: Array<ChatCompletionMessageParam> = [];
            messages.push({ role: 'user', content: completePrompt });

            const aiService = AIService.getInstance();
            const config = ConfigService.getInstance().getAllConfig();
            const streamGenerator = await aiService.chatStreaming(messages, 'TRANSLATE', config.smallModel);

            let fullResponse = '';
            for await (const chunk of streamGenerator) {
                fullResponse += chunk;
                yield { text: chunk };
            }

            return { replaceText: fullResponse };
        }.bind(this);

        return generator();
    }

    /**
     * 全文翻译 - 类似 Translate 模式
     */
    private async translateFullDocument(request: ProcessRequest): Promise<ProcessResponse> {
        // 检查用户是否提供了目标语言
        if (Utils.isEmpty(request.msg)) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                'Translation requires target language. Please specify the language in your message (e.g., "English", "中文", "日本語")',
                'Translation requires target language specification',
            );
        }

        // 检查文件路径是否存在
        if (Utils.isEmpty(request.filePath)) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                'Translation requires a file path',
                'Translation requires a file path',
            );
        }

        try {
            // 先从用户消息中推断目标语言
            const inferredLanguage = await this.inferTargetLanguage(request.msg);

            // 读取完整文件内容
            const fileContent = await FileUtils.readFileContentAsync(
                request.filePath!,
                FileUtils.SupportedFileTypes.MARKDOWN
            );

            if (!fileContent) {
                throw new AppError(
                    ErrorCode.SERVER_ERROR,
                    'Unable to read file content or file type not supported',
                    'File reading failed',
                );
            }
            
            // 准备翻译消息，使用推断的语言，全文内容中替换掉翻译的 bb 标签
            const completePrompt = this.generateCompleteTranslatePrompt(fileContent.replace(request.cmdText, ''), request.msg, 'document', inferredLanguage);
            const messages: Array<ChatCompletionMessageParam> = [];
            messages.push({ role: 'user', content: completePrompt });

            // 调用AI进行翻译
            const aiService = AIService.getInstance();
            const config = ConfigService.getInstance().getAllConfig();
            const translatedContent = await aiService.chat(messages, 'TRANSLATE', config.smallModel);

            // 生成新文件名，使用推断的语言
            const parsedPath = path.parse(request.filePath!);
            const languageForFileName = inferredLanguage.toLowerCase().replace(/\s+/g, '_');
            const newFileName = `${parsedPath.name}_${languageForFileName}${parsedPath.ext}`;
            const newFilePath = path.join(parsedPath.dir, newFileName);

            // 在翻译内容末尾添加BB标签
            const translatedContentWithTag = translatedContent + '\n\n' + this.translateTag();

            // 写入翻译内容到新文件
            await fs.promises.writeFile(newFilePath, translatedContentWithTag, 'utf-8');

            // 创建Markdown超链接格式的replaceText，使用推断的语言
            const markdownLink = `[${inferredLanguage} Version](${newFileName})`;

            return {
                replaceText: markdownLink,
            };

        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                ErrorCode.UNKNOWN_ERROR,
                `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'Translation process failed',
            );
        }
    }

    /**
     * 全文流式翻译 - 类似 Translator 模式（模拟流式处理）
     */
    private async translateFullDocumentStreaming(
        request: ProcessRequest
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: Translator): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            const response = await this.translateFullDocument(request);
            yield { text: response.replaceText, replace: true };
            return response;
        }.bind(this);
        return generator();
    }

    /**
     * 从用户消息中推断目标语言
     */
    private async inferTargetLanguage(userMessage: string): Promise<string> {
        const inferPrompt = `Analyze the following user message and determine the target language they want to translate to. The user message might be:
1. A language name (e.g., "English", "中文", "Japanese")
2. A phrase in the target language
3. Instructions containing the target language

Return ONLY the language name in its native form when possible (e.g., "English", "中文", "日本語", "Français"). If uncertain, return the most likely language name.

User message: "${userMessage}"`;

        const messages: Array<ChatCompletionMessageParam> = [];
        messages.push({ role: 'user', content: inferPrompt });

        const aiService = AIService.getInstance();
        const config = ConfigService.getInstance().getAllConfig();
        const inferredLanguage = await aiService.chat(messages, 'TRANSLATE', config.smallModel);

        return inferredLanguage.trim();
    }

    public translateTag(): string {
        return '[![BB](https://img.shields.io/badge/translated_by-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)';
    }


    /**
     * 生成完整的翻译提示词（集中处理所有提示词逻辑）
     */
    private generateCompleteTranslatePrompt(text: string, userMsg: string, mode: 'block' | 'document', targetLanguage: string, fileContext?: string): string {
        const basePrompt = this.buildTranslatePrompt(text, targetLanguage, mode, fileContext);
        return this.addUserInstructions(basePrompt, userMsg);
    }

    /**
     * 获取文件上下文内容
     */
    private async getFileContext(filePath: string): Promise<string | undefined> {
        if (Utils.isEmpty(filePath)) {
            return undefined;
        }

        try {
            const content = await FileUtils.readFileContentAsync(
                filePath,
                FileUtils.SupportedFileTypes.MARKDOWN
            );
            return content || undefined;
        } catch (error) {
            console.warn('Failed to read file context for translation:', error);
            return undefined;
        }
    }

    /**
     * 添加用户附加指令到提示词
     */
    private addUserInstructions(basePrompt: string, userMsg: string): string {
        if (Utils.isEmpty(userMsg)) {
            return basePrompt;
        }

        return `${basePrompt}

## Additional User Instructions:
${userMsg}

Please incorporate these specific requirements while translating the text.`;
    }

    /**
     * 构建基础翻译提示词
     */
    private buildTranslatePrompt(text: string, targetLanguage: string, mode: 'block' | 'document' = 'document', fileContext?: string): string {
        if (mode === 'document') {
            return `You are a professional translator. Your task is to translate the entire document to ${targetLanguage} while maintaining formatting and meaning.

## Document Translation Requirements:
- **Preserve formatting syntax**: Keep all markdown syntax (# ## ### etc.), HTML tags, code block markers, link syntax, and structural elements exactly as they appear
- **Translate all content**: Translate ALL readable text content including headings, paragraphs, list items, link text, and image alt text
- **Maintain meaning**: Ensure complete semantic accuracy while adapting for cultural context
- **Natural flow**: Produce text that reads naturally in the target language
- **Consistency**: Maintain consistent terminology and style throughout the document

## Content Translation Rules:
- **DO translate**: All headings (# Title, ## Subtitle, etc.), paragraph text, list items, link descriptions, image alt text, table content
- **DO NOT translate**: Code snippets within \`\`\` blocks, inline code within \`backticks\`, URLs, file paths, variable names, technical abbreviations (API, HTTP, CSS, etc.)
- **Special handling**: For technical terms that have established translations in the target language, use the appropriate translated term

## Examples:
- \`# Getting Started\` → \`# ${targetLanguage === '中文' ? '开始使用' : 'Getting Started'}\` (translate the heading text)
- \`\`\`javascript\` → \`\`\`javascript\` (keep code blocks unchanged)
- \`const API_KEY = "xxx"\` → \`const API_KEY = "xxx"\` (keep code unchanged)
- \`[Click here](url)\` → \`[${targetLanguage === '中文' ? '点击这里' : 'Click here'}](url)\` (translate link text, keep URL)

## Target Language: ${targetLanguage}

## Document to Translate:
<text>
${text}
</text>

## Output Requirements:
Return only the translated content without explanations or prefixes. The translation should maintain all original formatting structure while translating all readable content.`;
        } else {
            const contextSection = fileContext ? `
## Full Document Context:
<context>
${fileContext}
</context>

` : '';

            return `You are a professional translator. Your task is to translate the provided text block to ${targetLanguage} while maintaining formatting and meaning. You have access to the full document context for better translation accuracy.

## Text Block Translation Guidelines:
- **Grammar & Language**: Translate with proper grammar and natural flow in the target language
- **Formatting Preservation**: Keep all markdown syntax, HTML tags, code blocks, and structural elements exactly as they appear
- **Context Awareness**: Use the provided full document context to ensure the translation fits well within the entire document structure
- **Consistency**: Maintain consistent terminology and style that aligns with the full document context
- **Natural Integration**: Ensure the translated text block flows naturally with the surrounding content
- **Cultural Adaptation**: Adapt content appropriately for the target language's cultural context

## Content Translation Rules:
- **DO translate**: All readable text content including headings, paragraphs, list items, link descriptions, image alt text
- **DO NOT translate**: Code snippets within \`\`\` blocks, inline code within \`backticks\`, URLs, file paths, variable names, technical abbreviations
- **Special handling**: For technical terms, use established translations in the target language when available
- **Contextual consistency**: Reference information from the full document context to maintain consistent terminology and style

## Target Language: ${targetLanguage}
${contextSection}## Text Block to Translate:
<text>
${text}
</text>

## Output Requirements:
Return only the translated text block without explanations or meta-commentary. The result should be a natural, well-translated version that integrates seamlessly within the full document context.`;
        }
    }
}