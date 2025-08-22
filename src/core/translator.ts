import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { Utils, FileUtils } from '../utils/helpers';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { AIProxy } from '../utils/aiProxy';
import * as fs from 'fs';
import * as path from 'path';

export interface TranslationRequest {
    selectText: string;      // 包含 BBCmd 的文本
    filePath: string;        // 文本所在文件的路径
    msg: string;             // 用户的附加消息
}

export interface TranslationResult {
    success: boolean;
    result: string;
    replaceText: string;
}

export class Translator {
    private static instance: Translator = new Translator();
    private constructor() { }

    public static getInstance(): Translator {
        return Translator.instance;
    }

    /**
     * 处理翻译请求
     * 读取完整文件内容，翻译后输出到新文件
     */
    public async handleTranslation(request: TranslationRequest): Promise<TranslationResult> {
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

            // 准备翻译消息，使用推断的语言
            const completePrompt = this.buildTranslatePrompt(fileContent, inferredLanguage);
            const messages: Array<ChatCompletionMessageParam> = [];
            messages.push({ role: 'user', content: completePrompt });

            // 调用AI进行翻译
            const aiProxy = AIProxy.getInstance();
            const translatedContent = await aiProxy.chat(messages, 'TRANSLATE');

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

            const resultMessage = `Translation completed! File saved as: ${newFileName}\n\nTranslated from ${parsedPath.name}${parsedPath.ext} to ${inferredLanguage}`;

            return {
                success: true,
                result: resultMessage,
                replaceText: markdownLink
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

        const aiProxy = AIProxy.getInstance();
        const inferredLanguage = await aiProxy.chat(messages, 'TRANSLATE');

        return inferredLanguage.trim();
    }

    public translateTag(): string {
        return '[![BB](https://img.shields.io/badge/translated_by-BB-FFD900)](https://github.com/SandyKidYao/blogbuddy)';
    }


    /**
     * 构建基础翻译提示词
     */
    private buildTranslatePrompt(text: string, targetLanguage: string): string {
        return `You are a professional translator. Your task is to translate the provided text to ${targetLanguage} while maintaining formatting and meaning.

## Translation Requirements:
- **Preserve ALL formatting**: Keep all markdown syntax, HTML tags, code blocks, links, and structural elements exactly as they appear
- **Maintain meaning**: Ensure complete semantic accuracy while adapting for cultural context
- **Natural flow**: Produce text that reads naturally in the target language
- **Handle code**: Do not translate code snippets, variable names, or technical identifiers
- **Keep structure**: Preserve paragraph breaks, bullet points, numbering, and layout

## Target Language: ${targetLanguage}

## Text to Translate:
<text>
${text}
</text>

## Output Requirements:
Return only the translated content without explanations or prefixes. The translation should maintain all original formatting and structure.`;
    }
}