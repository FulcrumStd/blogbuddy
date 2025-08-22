import { Utils, FileUtils } from '../utils/helpers';
import { AIProxy } from '../utils/aiProxy';
import { AppError, ErrorCode } from '../utils/ErrorHandler';
import * as fs from 'fs';
import * as path from 'path';

export interface ImproveRequest {
    selectText: string;      // 包含 BBCmd 的文本
    filePath: string;        // 文本所在文件的路径
    msg: string;             // 用户的附加消息
}

export interface ImproveResult {
    success: boolean;
    result: string;
    replaceText: string;
}

export class TextImprover {
    private static instance: TextImprover = new TextImprover();
    private constructor() { }
    
    public static getInstance(): TextImprover {
        return TextImprover.instance;
    }

    /**
     * 处理文本润色请求 - 真正的润色功能
     */
    public async handleTextImprovement(request: ImproveRequest): Promise<ImproveResult> {
        try {
            // 判断是否为文本块润色还是全文润色
            const hasSelectedText = !Utils.isEmpty(request.selectText);

            if (hasSelectedText) {
                // 文本块润色模式
                return await this.improveTextBlock(request);
            } else {
                // 全文润色模式
                return await this.improveFullDocument(request);
            }

        } catch (error) {
            return {
                success: false,
                result: `Text improvement failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                replaceText: request.selectText // 失败时返回原文
            };
        }
    }

    /**
     * 文本块润色 - 类似 Expand 模式
     */
    private async improveTextBlock(request: ImproveRequest): Promise<ImproveResult> {
        // 获取全文上下文
        const fileContext = await this.getFileContext(request.filePath);
        
        const completePrompt = this.generateCompleteImprovePrompt(request.selectText, request.msg, 'block', fileContext);

        // 准备消息
        const messages: Array<any> = [];
        messages.push({ role: 'user', content: completePrompt });

        // 调用AI进行文本润色
        const aiProxy = AIProxy.getInstance();
        const improvedContent = await aiProxy.chat(messages, 'IMPROVE');

        return {
            success: true,
            result: 'Text block improvement completed successfully.',
            replaceText: improvedContent
        };
    }

    /**
     * 全文润色 - 类似 Translate 模式
     */
    private async improveFullDocument(request: ImproveRequest): Promise<ImproveResult> {
        // 检查文件路径是否存在
        if (Utils.isEmpty(request.filePath)) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                'Full document improvement requires a file path',
                'Full document improvement requires a file path'
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

        const completePrompt = this.generateCompleteImprovePrompt(fileContent, request.msg, 'document');

        // 准备消息
        const messages: Array<any> = [];
        messages.push({ role: 'user', content: completePrompt });

        // 调用AI进行全文润色
        const aiProxy = AIProxy.getInstance();
        const improvedContent = await aiProxy.chat(messages, 'IMPROVE');

        // 生成新文件名
        const parsedPath = path.parse(request.filePath!);
        const newFileName = `${parsedPath.name}_improved${parsedPath.ext}`;
        const newFilePath = path.join(parsedPath.dir, newFileName);

        // 在润色内容末尾添加BB标签
        const improvedContentWithTag = improvedContent + '\n\n' + this.improveTag();

        // 写入润色内容到新文件
        await fs.promises.writeFile(newFilePath, improvedContentWithTag, 'utf-8');

        const resultMessage = `Document improvement completed! File saved as: ${newFileName}\n\nImproved from ${parsedPath.name}${parsedPath.ext}`;

        return {
            success: true,
            result: resultMessage,
            replaceText: resultMessage
        };
    }

    /**
     * 生成完整的润色提示词（集中处理所有提示词逻辑）
     */
    private generateCompleteImprovePrompt(text: string, userMsg: string, mode: 'block' | 'document', fileContext?: string): string {
        const basePrompt = this.buildImprovePrompt(text, mode, fileContext);
        return this.addUserInstructions(basePrompt, userMsg);
    }

    /**
     * 构建基础润色提示词
     */
    private buildImprovePrompt(text: string, mode: 'block' | 'document', fileContext?: string): string {
        if (mode === 'document') {
            return `You are a professional text editor. Your task is to comprehensively improve the entire document while maintaining its original structure and meaning.

## Document Improvement Guidelines:
- **Content Quality**: Enhance clarity, coherence, and logical flow throughout
- **Language Enhancement**: Improve vocabulary, sentence variety, and sophistication
- **Structure Optimization**: Maintain existing structure but improve organization
- **Consistency**: Ensure consistent tone, style, and formatting
- **Readability**: Make content more engaging and accessible
- **Professional Polish**: Elevate overall quality to professional standards

## Key Constraints:
- Preserve the fundamental organization and section structure
- Keep all key information and main points intact
- Enhance rather than replace the author's writing style
- Focus on improving existing content, not adding new information

## Document to Improve:
<text>
${text}
</text>

## Output Requirements:
Return the complete improved document with enhanced quality. Do not include explanatory notes or comments about changes made.`;
        } else {
            const contextSection = fileContext ? `
## Full Document Context:
<context>
${fileContext}
</context>

` : '';

            return `You are a professional text editor. Your task is to improve the provided text by enhancing clarity, flow, grammar, and overall quality while preserving the original meaning. You have access to the full blog content for context.

## Text Improvement Guidelines:
- **Grammar & Spelling**: Fix all errors and punctuation issues
- **Clarity**: Improve sentence structure and word choice for better readability
- **Flow**: Enhance transitions between sentences and paragraphs
- **Conciseness**: Remove redundancy while maintaining completeness
- **Tone Consistency**: Maintain appropriate tone for the content type and ensure consistency with the full document
- **Structure Preservation**: Keep original structure and main points intact
- **Context Awareness**: Use the provided full document context to ensure the improved text fits well within the entire blog structure
- **Coherence**: Make sure the improved text flows naturally with the surrounding content and maintains thematic consistency

## Key Principles:
- Preserve the core message and intent
- Maintain the author's writing style and personality that's consistent with the full document
- Enhance readability and engagement while fitting the overall blog narrative
- Ensure professional quality standards that align with the entire document
- Reference information from the full blog context when appropriate to improve coherence
${contextSection}## Text to Improve:
<text>
${text}
</text>

## Output Requirements:
Return only the improved text without explanations or meta-commentary. The result should be a polished, professional version of the original content that integrates seamlessly within the full blog context.`;
        }
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
            console.warn('Failed to read file context for improvement:', error);
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

Please incorporate these specific requirements while improving the text.`;
    }

    /**
     * 获取 BB Improve 标签文本
     */
    public improveTag(): string {
        return '[![BB](https://img.shields.io/badge/improved_by-BB-FFD900)](https://github.com/SandyKidYao/blogbuddy)';
    }

}