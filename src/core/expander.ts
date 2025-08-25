import { Utils, FileUtils } from '../utils/helpers';
import { AIProxy, StreamingChatOptions } from '../utils/aiProxy';

export interface ExpansionRequest {
    selectText: string;      // 包含 BBCmd 的文本
    filePath: string;        // 文本所在文件的路径
    msg: string;             // 用户的附加消息
}

export interface ExpansionResult {
    success: boolean;
    result: string;
    replaceText: string;
}

export interface StreamingExpansionOptions {
    onChunk?: (chunk: string) => void;
    onProgress?: (current: number, total: number) => void;
    onComplete?: (fullResult: string) => void;
    onError?: (error: Error) => void;
}

export class Expander {
    private static instance: Expander = new Expander();
    private constructor() { }
    
    public static getInstance(): Expander {
        return Expander.instance;
    }

    /**
     * 处理扩写请求 - 真正的扩写功能
     */
    public async handleExpansion(request: ExpansionRequest): Promise<ExpansionResult> {
        try {
            // 生成完整的扩写提示词
            const completePrompt = await this.generateCompleteExpandPrompt(request);

            // 准备消息
            const messages: Array<any> = [];
            messages.push({ role: 'user', content: completePrompt });

            // 调用AI进行扩写
            const aiProxy = AIProxy.getInstance();
            const expandedContent = await aiProxy.chat(messages, 'EXPAND');

            return {
                success: true,
                result: 'Text expansion completed successfully.',
                replaceText: expandedContent
            };

        } catch (error) {
            return {
                success: false,
                result: `Expansion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                replaceText: request.selectText // 失败时返回原文
            };
        }
    }

    /**
     * 处理流式扩写请求 - 返回AsyncGenerator用于逐步输出结果
     */
    public async handleExpansionStreaming(
        request: ExpansionRequest,
        options: StreamingExpansionOptions = {}
    ): Promise<AsyncGenerator<string, ExpansionResult, unknown>> {
        const generator = async function* (this: Expander): AsyncGenerator<string, ExpansionResult, unknown> {
            try {
                // 生成完整的扩写提示词
                const completePrompt = await this.generateCompleteExpandPrompt(request);

                // 准备消息
                const messages: Array<any> = [];
                messages.push({ role: 'user', content: completePrompt });

                // 调用AI进行流式扩写
                const aiProxy = AIProxy.getInstance();
                let fullResponse = '';
                let charCount = 0;
                const estimatedTotalLength = request.selectText.length * 3; // 估算扩展后的长度

                const streamingOptions: StreamingChatOptions = {
                    onChunk: (chunk: string) => {
                        fullResponse += chunk;
                        charCount += chunk.length;
                        
                        if (options.onChunk) {
                            options.onChunk(chunk);
                        }
                        
                        if (options.onProgress) {
                            options.onProgress(charCount, Math.max(estimatedTotalLength, charCount));
                        }
                    },
                    onComplete: (response: string) => {
                        if (options.onComplete) {
                            options.onComplete(response);
                        }
                    },
                    onError: (error: Error) => {
                        if (options.onError) {
                            options.onError(error);
                        }
                    }
                };

                const streamGenerator = await aiProxy.chatStreaming(messages, 'EXPAND_STREAM', streamingOptions);
                
                // 逐个yield从AI返回的文本块
                for await (const chunk of streamGenerator) {
                    yield chunk;
                }

                // 返回最终结果
                return {
                    success: true,
                    result: 'Streaming text expansion completed successfully.',
                    replaceText: fullResponse
                };

            } catch (error) {
                if (options.onError) {
                    options.onError(error as Error);
                }

                return {
                    success: false,
                    result: `Streaming expansion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    replaceText: request.selectText // 失败时返回原文
                };
            }
        }.bind(this);

        return generator();
    }

    /**
     * 简化的流式扩写方法 - 仅返回文本流，无回调
     */
    public async handleExpansionStreamingSimple(
        request: ExpansionRequest
    ): Promise<AsyncGenerator<string, string, unknown>> {
        const generator = async function* (this: Expander): AsyncGenerator<string, string, unknown> {
            try {
                const completePrompt = await this.generateCompleteExpandPrompt(request);
                const messages: Array<any> = [];
                messages.push({ role: 'user', content: completePrompt });

                const aiProxy = AIProxy.getInstance();
                const streamGenerator = await aiProxy.chatStreamingSimple(messages, 'EXPAND_STREAM_SIMPLE');
                
                let fullResponse = '';
                for await (const chunk of streamGenerator) {
                    fullResponse += chunk;
                    yield chunk;
                }

                return fullResponse;

            } catch (error) {
                throw error;
            }
        }.bind(this);

        return generator();
    }

    /**
     * 生成完整的扩写提示词（集中处理所有提示词逻辑）
     */
    private async generateCompleteExpandPrompt(request: ExpansionRequest): Promise<string> {
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