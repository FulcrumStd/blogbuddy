import { Utils, FileUtils } from '../utils/helpers';
import { AIProxy } from '../utils/aiProxy';
import { ProcessRequest, ProcessResponse, ProcessChunk, Processor, StreamingProcessor } from './types';


export class KeywordExtractor implements StreamingProcessor {
    private static instance: KeywordExtractor = new KeywordExtractor();
    private constructor() { }

    public static getInstance(): KeywordExtractor {
        return KeywordExtractor.instance;
    }

    /**
     * 处理关键词提取请求 - 真正的关键词提取功能
     */
    public async process(request: ProcessRequest): Promise<ProcessResponse> {
        const completePrompt = await this.generateCompleteKeywordPrompt(request);

        // 准备消息
        const messages: Array<any> = [];
        messages.push({ role: 'user', content: completePrompt });

        // 调用AI进行关键词提取
        const aiProxy = AIProxy.getInstance();
        const keywordContent = await aiProxy.chat(messages, 'KEYWORD');
        // keyword 的 cmd 保留用户选择的文本
        return {
            replaceText: `${request.selectText}\n ${keywordContent}`,
        };
    }

    /**
     * 统一的流式处理接口实现
     */
    public async processStreaming(
        request: ProcessRequest
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: KeywordExtractor): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            const completePrompt = await this.generateCompleteKeywordPrompt(request);
            const messages: Array<any> = [];
            messages.push({ role: 'user', content: completePrompt });

            const aiProxy = AIProxy.getInstance();
            const streamGenerator = await aiProxy.chatStreamingSimple(messages, 'KEYWORD');
            // keyword 的 cmd 保留用户选择的文本
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
     * 生成完整的关键词提示词（集中处理所有提示词逻辑）
     */
    private async generateCompleteKeywordPrompt(request: ProcessRequest): Promise<string> {
        const content = await FileUtils.readFileContentAsync(
            request.filePath,
            FileUtils.SupportedFileTypes.MARKDOWN
        ) || request.selectText;
        const basePrompt = this.buildKeywordPrompt(content);
        return this.addUserInstructions(basePrompt, request.msg);
    }



    /**
     * 构建基础关键词提示词
     */
    private buildKeywordPrompt(text: string): string {
        return `You are a keyword extraction specialist. Your task is to extract relevant, SEO-friendly keywords and key phrases from the provided content.

## Keyword Requirements:
- **Quantity**: Extract 8-12 keywords/phrases total
- **Variety**: Include both single words and multi-word phrases
- **Relevance**: Focus on terms that capture the core topics and themes
- **SEO Value**: Prioritize terms people would likely search for
- **Hierarchy**: Include both broad topics and specific concepts

## Extraction Guidelines:
- **Primary Keywords**: 3-4 main topic keywords (1-2 words each)
- **Long-tail Keywords**: 3-4 specific phrases (2-4 words each)
- **Supporting Keywords**: 2-4 related/secondary terms
- **Avoid**: Common words, articles, prepositions, overly generic terms
- **Consider**: Technical terms, proper nouns, industry-specific vocabulary
- **Balance**: Mix of popular search terms and niche-specific keywords

## Output Format:
Present keywords as a clean, organized list:

\`\`\`
---
**Keywords**: *Primary keyword 1*, *Primary keyword 2*, *Long-tail keyword phrase 1*, *Long-tail keyword phrase 2*, *Supporting keyword 1*, *Supporting keyword 2*  
\`\`\`

## Content for Analysis:
<text>
${text}
</text>

## Output Requirements:
Return the keyword list with the heading, organized by relevance and search potential. Focus on terms that would help readers discover this content.`;
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

Please incorporate these instructions while extracting keywords.`;
    }

}