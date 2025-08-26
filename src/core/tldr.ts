import { Utils, FileUtils } from '../utils/helpers';
import { AIProxy } from '../utils/aiProxy';
import { ProcessRequest, ProcessResponse, ProcessChunk, Processor, StreamingProcessor } from './types';


export class TldrGenerator implements StreamingProcessor {
    private static instance: TldrGenerator = new TldrGenerator();
    private constructor() { }
    
    public static getInstance(): TldrGenerator {
        return TldrGenerator.instance;
    }

    /**
     * 处理TLDR生成请求 - 真正的TLDR生成功能
     */
    public async process(request: ProcessRequest): Promise<ProcessResponse> {
            const completePrompt = await this.generateCompleteTldrPrompt(request);

            // 准备消息
            const messages: Array<any> = [];
            messages.push({ role: 'user', content: completePrompt });

            // 调用AI进行TLDR生成
            const aiProxy = AIProxy.getInstance();
            const tldrContent = await aiProxy.chat(messages, 'TLDR');
            // tldr 的 cmd 保留用户选择的文本
            return {
                replaceText: `${request.selectText}\n ${tldrContent}`,
            };
    }

    /**
     * 统一的流式处理接口实现
     */
    public async processStreaming(
        request: ProcessRequest
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: TldrGenerator): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            const completePrompt = await this.generateCompleteTldrPrompt(request);
            const messages: Array<any> = [];
            messages.push({ role: 'user', content: completePrompt });

            const aiProxy = AIProxy.getInstance();
            const streamGenerator = await aiProxy.chatStreamingSimple(messages, 'TLDR');
            // tldr 的 cmd 保留用户选择的文本
            let fullResponse = request.selectText;
            if(fullResponse.length > 0) {
                yield {text: fullResponse + '\n'};
            }
            
            for await (const chunk of streamGenerator) {
                fullResponse += chunk;
                yield { text: chunk };
            }

            return { replaceText: fullResponse };
        }.bind(this);

        return generator();
    }


    /**
     * 生成完整的 TLDR 提示词（集中处理所有提示词逻辑）
     */
    private async generateCompleteTldrPrompt(request: ProcessRequest): Promise<string> {
        const content = await FileUtils.readFileContentAsync(
            request.filePath,
            FileUtils.SupportedFileTypes.MARKDOWN
        ) || request.selectText;
        const basePrompt = this.buildTldrPrompt(content);
        return this.addUserInstructions(basePrompt, request.msg);
    }

    /**
     * 构建基础 TLDR 提示词
     */
    private buildTldrPrompt(text: string): string {
        return `You are a content summarization specialist. Your task is to generate a concise, informative TL;DR summary that captures the essential points and key insights.

## TL;DR Requirements:
- **Concise Format**: Keep summary to 2-4 bullet points or 2-3 sentences maximum
- **Essential Points Only**: Focus on the most important information and main takeaways
- **Actionable Insights**: Include key insights, conclusions, or actionable information
- **Clear Structure**: Use clear, direct language that's easy to scan
- **Self-Contained**: Make it understandable without reading the full content

## Content Analysis Guidelines:
- **Identify Core Message**: Extract the primary purpose and main arguments
- **Key Facts & Data**: Include important statistics, findings, or factual information
- **Main Conclusions**: Highlight critical insights, recommendations, or outcomes
- **Skip Details**: Omit examples, anecdotes, and supporting details
- **Maintain Context**: Ensure the summary makes sense independently

## Output Format:
Start with a clear "## TL;DR" heading, then provide the summary in a clean, scannable format using bullet points or short paragraphs.

## Content to Summarize:
<text>
${text}
</text>

## Output Requirements:
Return the TLDR with the heading, followed by a concise summary that captures the essence of the content. Focus on what readers need to know most.`;
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

Please incorporate these instructions while generating the TLDR.`;
    }

}