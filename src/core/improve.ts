import { Utils, FileUtils } from '../utils/helpers';
import { AIService } from '../services/AIService';
import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { ProcessRequest, ProcessResponse, ProcessChunk, Processor } from './types';
import * as fs from 'fs';
import * as path from 'path';


export class TextImprover implements Processor {
    private static instance: TextImprover = new TextImprover();
    private constructor() { }

    public static getInstance(): TextImprover {
        return TextImprover.instance;
    }

    public async process(
        request: ProcessRequest,
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const hasSelectedText = !Utils.isEmpty(request.selectText);
        if (hasSelectedText) {
            return this.improveTextBlockStreaming(request);
        } else {
            return this.improveFullDocumentStreaming(request);
        }
    }

    /**
     * 文本块流式润色 — 真正的 token 级流式
     */
    private async improveTextBlockStreaming(
        request: ProcessRequest,
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: TextImprover): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            const fileContext = await this.getFileContext(request.filePath);
            const completePrompt = this.generateCompleteImprovePrompt(request.selectText, request.msg, 'block', fileContext);

            const messages: Array<any> = [{ role: 'user', content: completePrompt }];
            const aiService = AIService.getInstance();
            const streamGenerator = await aiService.chatStreaming(messages, 'IMPROVE');

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
     * 全文润色 — 一次性调用，流式只是把最终结果作为一个 chunk 吐出（链接）
     */
    private async improveFullDocumentStreaming(
        request: ProcessRequest,
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: TextImprover): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            const response = await this.improveFullDocument(request);
            yield { text: response.replaceText, replace: true };
            return response;
        }.bind(this);
        return generator();
    }

    private async improveFullDocument(request: ProcessRequest): Promise<ProcessResponse> {
        if (Utils.isEmpty(request.filePath)) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                'Full document improvement requires a file path',
                'Full document improvement requires a file path',
            );
        }

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

        const completePrompt = this.generateCompleteImprovePrompt(
            fileContent.replace(request.cmdText, ''),
            request.msg,
            'document',
        );
        const messages: Array<any> = [{ role: 'user', content: completePrompt }];

        const aiService = AIService.getInstance();
        const improvedContent = await aiService.chat(messages, 'IMPROVE');

        const parsedPath = path.parse(request.filePath!);
        const newFileName = `${parsedPath.name}_improved${parsedPath.ext}`;
        const newFilePath = path.join(parsedPath.dir, newFileName);
        const improvedContentWithTag = improvedContent + '\n\n' + this.improveTag();
        await fs.promises.writeFile(newFilePath, improvedContentWithTag, 'utf-8');

        return { replaceText: `[Improved Version](${newFileName})` };
    }

    private generateCompleteImprovePrompt(text: string, userMsg: string, mode: 'block' | 'document', fileContext?: string): string {
        const basePrompt = this.buildImprovePrompt(text, mode, fileContext);
        return this.addUserInstructions(basePrompt, userMsg);
    }

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

    private async getFileContext(filePath: string): Promise<string | undefined> {
        if (Utils.isEmpty(filePath)) { return undefined; }
        try {
            const content = await FileUtils.readFileContentAsync(
                filePath,
                FileUtils.SupportedFileTypes.MARKDOWN,
            );
            return content || undefined;
        } catch (error) {
            console.warn('Failed to read file context for improvement:', error);
            return undefined;
        }
    }

    private addUserInstructions(basePrompt: string, userMsg: string): string {
        if (Utils.isEmpty(userMsg)) { return basePrompt; }
        return `${basePrompt}

## Additional User Instructions:
${userMsg}

Please incorporate these specific requirements while improving the text.`;
    }

    public improveTag(): string {
        return '[![BB](https://img.shields.io/badge/improved_by-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)';
    }
}
