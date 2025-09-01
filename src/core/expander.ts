import { Utils, FileUtils } from '../utils/helpers';
import { AIService } from '../services/AIService';
import { ProcessChunk, ProcessRequest, ProcessResponse, StreamingProcessor } from './types';


export class Expander implements StreamingProcessor {
    private static instance: Expander = new Expander();
    private constructor() { }

    public static getInstance(): Expander {
        return Expander.instance;
    }



    /**
     * 统一的处理接口实现
     */
    public async process(request: ProcessRequest): Promise<ProcessResponse> {
        // 生成完整的扩写提示词
        const completePrompt = await this.generateCompleteExpandPrompt(request);

        // 准备消息
        const messages: Array<any> = [];
        messages.push({ role: 'user', content: completePrompt });

        // 调用AI进行扩写
        const aiService = AIService.getInstance();
        const expandedContent = await aiService.chat(messages, 'EXPAND');

        return {
            replaceText: expandedContent
        };
    }


    /**
     * 统一的流式处理接口实现
     */
    public async processStreaming(
        request: ProcessRequest
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: Expander): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            const completePrompt = await this.generateCompleteExpandPrompt(request);
            const messages: Array<any> = [];
            messages.push({ role: 'user', content: completePrompt });

            const aiService = AIService.getInstance();
            const streamGenerator = await aiService.chatStreamingSimple(messages, 'EXPAND');

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
     * 生成完整的扩写提示词（集中处理所有提示词逻辑）
     */
    private async generateCompleteExpandPrompt(request: ProcessRequest): Promise<string> {
        // 始终读取博客全文作为上下文
        const fileContext = await this.getFileContext(request.filePath, true);

        // 构建基础扩写提示词
        const basePrompt = this.buildExpandPrompt(request.selectText, fileContext);

        // 添加用户附加指令（如果有）
        return this.addUserInstructions(basePrompt, request.msg);
    }

    /**
     * 获取文件上下文内容
     */
    private async getFileContext(filePath: string, needsContext: boolean): Promise<string | undefined> {
        if (!needsContext || Utils.isEmpty(filePath)) {
            return undefined;
        }

        try {
            const content = await FileUtils.readFileContentAsync(
                filePath,
                FileUtils.SupportedFileTypes.MARKDOWN
            );
            return content || undefined;
        } catch (error) {
            console.warn('Failed to read file context for expansion:', error);
            return undefined;
        }
    }

    /**
     * 构建基础扩写提示词
     */
    private buildExpandPrompt(text: string, fileContext?: string): string {
        const contextSection = fileContext ? `
## Full Document Context:
<context>
${fileContext}
</context>

` : '';

        return `You are a text expansion specialist. Your task is to expand the given text while maintaining its original meaning, style, and tone. You have access to the full blog content for context.

## Expansion Guidelines:
- **Preserve Core Message**: Keep the original meaning and intent intact
- **Add Substance**: Include concrete examples, data, or elaborative explanations where appropriate  
- **Maintain Consistency**: Match the formality level and writing style of the original text
- **Natural Integration**: Ensure the expanded version reads as a cohesive, well-developed piece
- **Context Awareness**: Use the provided full document context to ensure consistency with the overall narrative, avoid repetition, and ensure the expanded paragraph fits well within the entire blog structure
- **Coherence**: Make sure the expanded text flows naturally with the surrounding content and maintains thematic consistency

## Content Strategy:
- Reference information from the full blog context when appropriate
- Elaborate key concepts with supporting details that align with the blog's overall message
- Add relevant examples or analogies that complement the blog's theme
- Include transitional phrases to improve flow with adjacent paragraphs
- Expand on implications or consequences that are consistent with the blog's narrative
- Ensure the expanded content enhances the overall blog quality and readability
${contextSection}## Text to Expand:
<text>
${text}
</text>

## Output Requirements:
Return only the expanded text with no prefixes, explanations, or meta-commentary. The result should be a naturally flowing, well-developed version of the original content that fits seamlessly within the full blog context.`;
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

Please incorporate these instructions while expanding the text.`;
    }
}