import { Utils, FileUtils } from '../utils/helpers';
import { AIProxy } from '../utils/aiProxy';

export interface TldrRequest {
    selectText: string;      // 包含 BBCmd 的文本
    filePath: string;        // 文本所在文件的路径
    msg: string;             // 用户的附加消息
}

export interface TldrResult {
    success: boolean;
    result: string;
    replaceText: string;
}

export class TldrGenerator {
    private static instance: TldrGenerator = new TldrGenerator();
    private constructor() { }
    
    public static getInstance(): TldrGenerator {
        return TldrGenerator.instance;
    }

    /**
     * 处理TLDR生成请求 - 真正的TLDR生成功能
     */
    public async handleTldrGeneration(request: TldrRequest): Promise<TldrResult> {
        try {
            // 读取完整文件内容用于生成TLDR
            const fullContent = await this.getContentForTldrGeneration(request.filePath, request.selectText);
            const completePrompt = this.generateCompleteTldrPrompt(fullContent, request.msg);

            // 准备消息
            const messages: Array<any> = [];
            messages.push({ role: 'user', content: completePrompt });

            // 调用AI进行TLDR生成
            const aiProxy = AIProxy.getInstance();
            const tldrContent = await aiProxy.chat(messages, 'TLDR');

            return {
                success: true,
                result: 'TLDR generation completed successfully.',
                replaceText: tldrContent
            };

        } catch (error) {
            return {
                success: false,
                result: `TLDR generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                replaceText: request.selectText // 失败时返回原文
            };
        }
    }

    /**
     * 生成TLDR任务的提示词
     */
    public async getTldrTaskPrompt(request: TldrRequest): Promise<string> {
        // 读取完整文件内容用于生成TLDR
        const fullContent = await this.getContentForTldrGeneration(request.filePath, request.selectText);
        return this.generateCompleteTldrPrompt(fullContent, request.msg);
    }


    /**
     * 生成完整的 TLDR 提示词（集中处理所有提示词逻辑）
     */
    private generateCompleteTldrPrompt(content: string, userMsg: string): string {
        const basePrompt = this.buildTldrPrompt(content);
        return this.addUserInstructions(basePrompt, userMsg);
    }

    /**
     * 获取文件内容用于 TLDR 生成
     */
    private async getContentForTldrGeneration(filePath: string, selectText: string): Promise<string> {
        if (Utils.isEmpty(filePath)) {
            return selectText;
        }
        
        try {
            const content = await FileUtils.readFileContentAsync(
                filePath,
                FileUtils.SupportedFileTypes.MARKDOWN
            );
            return content || selectText;
        } catch (error) {
            console.warn('Failed to read file content for TLDR, using selected text:', error);
            return selectText;
        }
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