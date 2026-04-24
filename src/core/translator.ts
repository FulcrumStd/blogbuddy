import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { Utils, FileUtils } from '../utils/helpers';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { AIService } from '../services/AIService';
import { ProcessChunk, ProcessRequest, ProcessResponse, Processor } from './types';
import * as fs from 'fs';
import * as path from 'path';


export class Translator implements Processor {
    private static instance: Translator = new Translator();
    private constructor() { }

    public static getInstance(): Translator {
        return Translator.instance;
    }

    public async process(
        request: ProcessRequest,
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const hasSelectedText = !Utils.isEmpty(request.selectText);
        if (hasSelectedText) {
            return this.translateTextBlockStreaming(request);
        } else {
            return this.translateFullDocumentStreaming(request);
        }
    }

    private async translateTextBlockStreaming(
        request: ProcessRequest,
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: Translator): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            if (Utils.isEmpty(request.msg)) {
                throw new AppError(
                    ErrorCode.SERVER_ERROR,
                    'Translation requires target language. Please specify the language in your message (e.g., "English", "中文", "日本語")',
                    'Translation requires target language specification',
                );
            }

            const fileContext = await this.getFileContext(request.filePath);
            const inferredLanguage = await this.inferTargetLanguage(request.msg);
            const completePrompt = this.generateCompleteTranslatePrompt(
                request.selectText, request.msg, 'block', inferredLanguage, fileContext,
            );

            const messages: Array<ChatCompletionMessageParam> = [{ role: 'user', content: completePrompt }];
            const aiService = AIService.getInstance();
            const streamGenerator = await aiService.chatStreaming(messages, 'TRANSLATE');

            let fullResponse = '';
            for await (const chunk of streamGenerator) {
                fullResponse += chunk;
                yield { text: chunk };
            }
            return { replaceText: fullResponse };
        }.bind(this);

        return generator();
    }

    private async translateFullDocumentStreaming(
        request: ProcessRequest,
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: Translator): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            const response = await this.translateFullDocument(request);
            yield { text: response.replaceText, replace: true };
            return response;
        }.bind(this);
        return generator();
    }

    private async translateFullDocument(request: ProcessRequest): Promise<ProcessResponse> {
        if (Utils.isEmpty(request.msg)) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                'Translation requires target language. Please specify the language in your message (e.g., "English", "中文", "日本語")',
                'Translation requires target language specification',
            );
        }
        if (Utils.isEmpty(request.filePath)) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                'Translation requires a file path',
                'Translation requires a file path',
            );
        }

        try {
            const inferredLanguage = await this.inferTargetLanguage(request.msg);

            const fileContent = await FileUtils.readFileContentAsync(
                request.filePath!,
                FileUtils.SupportedFileTypes.MARKDOWN,
            );

            if (!fileContent) {
                throw new AppError(
                    ErrorCode.SERVER_ERROR,
                    'Unable to read file content or file type not supported',
                    'File reading failed',
                );
            }

            const completePrompt = this.generateCompleteTranslatePrompt(
                fileContent.replace(request.cmdText, ''),
                request.msg,
                'document',
                inferredLanguage,
            );
            const messages: Array<ChatCompletionMessageParam> = [{ role: 'user', content: completePrompt }];

            const aiService = AIService.getInstance();
            const translatedContent = await aiService.chat(messages, 'TRANSLATE');

            const parsedPath = path.parse(request.filePath!);
            const languageForFileName = inferredLanguage.toLowerCase().replace(/\s+/g, '_');
            const newFileName = `${parsedPath.name}_${languageForFileName}${parsedPath.ext}`;
            const newFilePath = path.join(parsedPath.dir, newFileName);

            const translatedContentWithTag = translatedContent + '\n\n' + this.translateTag();
            await fs.promises.writeFile(newFilePath, translatedContentWithTag, 'utf-8');

            return { replaceText: `[${inferredLanguage} Version](${newFileName})` };
        } catch (error) {
            if (error instanceof AppError) { throw error; }
            throw new AppError(
                ErrorCode.UNKNOWN_ERROR,
                `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'Translation process failed',
            );
        }
    }

    private async inferTargetLanguage(userMessage: string): Promise<string> {
        const inferPrompt = `Analyze the following user message and determine the target language they want to translate to. The user message might be:
1. A language name (e.g., "English", "中文", "Japanese")
2. A phrase in the target language
3. Instructions containing the target language

Return ONLY the language name in its native form when possible (e.g., "English", "中文", "日本語", "Français"). If uncertain, return the most likely language name.

User message: "${userMessage}"`;

        const messages: Array<ChatCompletionMessageParam> = [{ role: 'user', content: inferPrompt }];
        const aiService = AIService.getInstance();
        const inferredLanguage = await aiService.chat(messages, 'TRANSLATE');
        return inferredLanguage.trim();
    }

    public translateTag(): string {
        return '[![BB](https://img.shields.io/badge/translated_by-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)';
    }

    private generateCompleteTranslatePrompt(text: string, userMsg: string, mode: 'block' | 'document', targetLanguage: string, fileContext?: string): string {
        const basePrompt = this.buildTranslatePrompt(text, targetLanguage, mode, fileContext);
        return this.addUserInstructions(basePrompt, userMsg);
    }

    private async getFileContext(filePath: string): Promise<string | undefined> {
        if (Utils.isEmpty(filePath)) { return undefined; }
        try {
            const content = await FileUtils.readFileContentAsync(
                filePath,
                FileUtils.SupportedFileTypes.MARKDOWN,
            );
            return content || undefined;
        } catch (error) {
            console.warn('Failed to read file context for translation:', error);
            return undefined;
        }
    }

    private addUserInstructions(basePrompt: string, userMsg: string): string {
        if (Utils.isEmpty(userMsg)) { return basePrompt; }
        return `${basePrompt}

## Additional User Instructions:
${userMsg}

Please incorporate these specific requirements while translating the text.`;
    }

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
Return ONLY the translated content without any explanations, prefixes, suffixes, or wrapper tags like <text></text>. Do not include any meta-commentary, XML tags, HTML tags, or additional formatting beyond the original markdown structure. The translation should maintain all original formatting structure while translating all readable content.`;
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
Return ONLY the translated text block without any explanations, prefixes, suffixes, or wrapper tags like <text></text>. Do not include any meta-commentary, XML tags, HTML tags, or additional formatting beyond the original markdown structure. The result should be a natural, well-translated version that integrates seamlessly within the full document context.`;
        }
    }
}
