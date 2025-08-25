import { Utils, FileUtils } from '../utils/helpers';
import { AIProxy } from '../utils/aiProxy';
import { ProcessRequest, ProcessResponse, Processor } from './types';

// 向后兼容的类型别名
export type KeywordRequest = ProcessRequest;
export type KeywordResult = ProcessResponse & { success?: boolean; result?: string };

export class KeywordExtractor implements Processor {
    private static instance: KeywordExtractor = new KeywordExtractor();
    private constructor() { }
    
    public static getInstance(): KeywordExtractor {
        return KeywordExtractor.instance;
    }

    /**
     * 统一的处理接口实现
     */
    public async process(request: ProcessRequest): Promise<ProcessResponse> {
        const result = await this.handleKeywordExtraction(request);
        return {
            replaceText: result.replaceText
        };
    }

    /**
     * 处理关键词提取请求 - 真正的关键词提取功能
     */
    public async handleKeywordExtraction(request: KeywordRequest): Promise<KeywordResult> {
        try {
            // 读取完整文件内容用于提取关键词
            const fullContent = await this.getContentForKeywordExtraction(request.filePath, request.selectText);
            const completePrompt = this.generateCompleteKeywordPrompt(fullContent, request.msg);

            // 准备消息
            const messages: Array<any> = [];
            messages.push({ role: 'user', content: completePrompt });

            // 调用AI进行关键词提取
            const aiProxy = AIProxy.getInstance();
            const keywordContent = await aiProxy.chat(messages, 'KEYWORD');

            return {
                replaceText: keywordContent,
                success: true,
                result: 'Keyword extraction completed successfully.'
            };

        } catch (error) {
            return {
                replaceText: request.selectText, // 失败时返回原文
                success: false,
                result: `Keyword extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * 生成关键词提取任务的提示词
     */
    public async getKeywordTaskPrompt(request: KeywordRequest): Promise<string> {
        // 读取完整文件内容用于提取关键词
        const fullContent = await this.getContentForKeywordExtraction(request.filePath, request.selectText);
        return this.generateCompleteKeywordPrompt(fullContent, request.msg);
    }


    /**
     * 生成完整的关键词提示词（集中处理所有提示词逻辑）
     */
    private generateCompleteKeywordPrompt(content: string, userMsg: string): string {
        const basePrompt = this.buildKeywordPrompt(content);
        return this.addUserInstructions(basePrompt, userMsg);
    }

    /**
     * 获取文件内容用于关键词提取
     */
    private async getContentForKeywordExtraction(filePath: string, selectText: string): Promise<string> {
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
            console.warn('Failed to read file content for keyword extraction, using selected text:', error);
            return selectText;
        }
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