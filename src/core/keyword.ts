import { Utils, FileUtils } from '../utils/helpers';
import { AIService } from '../services/AIService';
import { ProcessRequest, ProcessResponse, ProcessChunk, Processor } from './types';


export class KeywordExtractor implements Processor {
    private static instance: KeywordExtractor = new KeywordExtractor();
    private constructor() { }

    public static getInstance(): KeywordExtractor {
        return KeywordExtractor.instance;
    }

    public async process(
        request: ProcessRequest,
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: KeywordExtractor): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            const completePrompt = await this.generateCompleteKeywordPrompt(request);
            const messages: Array<any> = [{ role: 'user', content: completePrompt }];

            const aiService = AIService.getInstance();
            const streamGenerator = await aiService.chatStreaming(messages, 'KEYWORD');

            // keyword 命令保留用户选择的文本
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

    private async generateCompleteKeywordPrompt(request: ProcessRequest): Promise<string> {
        const content = await FileUtils.readFileContentAsync(
            request.filePath,
            FileUtils.SupportedFileTypes.MARKDOWN,
        ) || request.selectText;
        const basePrompt = this.buildKeywordPrompt(content);
        return this.addUserInstructions(basePrompt, request.msg);
    }

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

    private addUserInstructions(basePrompt: string, userMsg: string): string {
        if (Utils.isEmpty(userMsg)) { return basePrompt; }
        return `${basePrompt}

## Additional User Instructions:
${userMsg}

Please incorporate these instructions while extracting keywords.`;
    }
}
