import { Utils, FileUtils } from '../utils/helpers';
import { AIService } from '../services/AIService';
import { ProcessRequest, ProcessResponse, ProcessChunk, Processor } from './types';


export class TldrGenerator implements Processor {
    private static instance: TldrGenerator = new TldrGenerator();
    private constructor() { }

    public static getInstance(): TldrGenerator {
        return TldrGenerator.instance;
    }

    public async process(
        request: ProcessRequest,
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: TldrGenerator): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            const completePrompt = await this.generateCompleteTldrPrompt(request);
            const messages: Array<any> = [{ role: 'user', content: completePrompt }];

            const aiService = AIService.getInstance();
            const streamGenerator = await aiService.chatStreaming(messages, 'TLDR');

            // tldr 命令保留用户选择的文本
            let fullResponse = request.selectText;
            if (fullResponse.length > 0) {
                yield { text: fullResponse + '\n' };
            }

            for await (const chunk of streamGenerator) {
                fullResponse += chunk;
                yield { text: chunk };
            }

            return { replaceText: fullResponse };
        }.bind(this);

        return generator();
    }

    private async generateCompleteTldrPrompt(request: ProcessRequest): Promise<string> {
        const content = await FileUtils.readFileContentAsync(
            request.filePath,
            FileUtils.SupportedFileTypes.MARKDOWN,
        ) || request.selectText;
        const basePrompt = this.buildTldrPrompt(content);
        return this.addUserInstructions(basePrompt, request.msg);
    }

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

    private addUserInstructions(basePrompt: string, userMsg: string): string {
        if (Utils.isEmpty(userMsg)) { return basePrompt; }
        return `${basePrompt}

## Additional User Instructions:
${userMsg}

Please incorporate these instructions while generating the TLDR.`;
    }
}
