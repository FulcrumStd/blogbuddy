import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { Translator } from './translator';
import { Expander, StreamingExpansionOptions } from './expander';
import { TldrGenerator } from './tldr';
import { KeywordExtractor } from './keyword';
import { MermaidGenerator } from './mermaid';
import { TextImprover } from './improve';
import { NormalProcessor } from './normal';

export enum BBCmd {
    NORMAL = 'bb',          // 直接给 Bgent 指令
    EXPAND = 'bb-expd',     // 扩写
    IMPROVE = 'bb-impv',    // 润色
    MERMAID = 'bb-mmd',     // 生成 Mermaid
    TRANSLATE = 'bb-tslt',  // 翻译
    KEYWORD = 'bb-kwd',     // 提取关键词
    TLDR = 'bb-tldr',       // 加入省流
    TAG = 'bb-tag',         // 加入 BBtag
}

export interface Bquest {
    selectText: string,      // 包含 BBCmd 的文本
    filePath: string,        // 文本所在文件的路径
    cmd: BBCmd,              // BBCmd
    msg: string,             // 用户的附加消息
}

export interface Bsponse {
    replaceText: string      // 替换掉用户选择的包含了 BBCmd 的文本
}

export interface StreamingBsponse {
    stream: AsyncGenerator<string, Bsponse, unknown>;
}

export interface StreamingActOptions {
    onChunk?: (chunk: string) => void;
    onProgress?: (current: number, total: number) => void;
    onComplete?: (result: Bsponse) => void;
    onError?: (error: Error) => void;
}

export class BB {
    private static instance: BB = new BB();
    private constructor() { }
    public static i(): BB {
        return BB.instance;
    }

    public async act(request: Bquest): Promise<Bsponse> {
        try {
            switch (request.cmd) {
                case BBCmd.EXPAND:
                    return await this.handleExpand(request);
                case BBCmd.TRANSLATE:
                    return await this.handleTranslate(request);
                case BBCmd.TLDR:
                    return await this.handleTldr(request);
                case BBCmd.KEYWORD:
                    return await this.handleKeyword(request);
                case BBCmd.MERMAID:
                    return await this.handleMermaid(request);
                case BBCmd.IMPROVE:
                    return await this.handleImprove(request);
                case BBCmd.NORMAL:
                    return await this.handleNormal(request);
                case BBCmd.TAG:
                    return await this.handleTag(request);
                default:
                    throw new AppError(
                        ErrorCode.UNKNOWN_ERROR,
                        `BB cannot handle command '${request.cmd}' right now.`,
                        `Unsupported command: ${request.cmd}`,
                    );
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                ErrorCode.UNKNOWN_ERROR,
                'BB encountered an unexpected error.',
                error instanceof Error ? error.message : 'Unknown error',
            );
        }
    }

    public async actStreaming(
        request: Bquest,
        options: StreamingActOptions = {}
    ): Promise<AsyncGenerator<string, Bsponse, unknown>> {
        const generator = async function* (this: BB): AsyncGenerator<string, Bsponse, unknown> {
            try {
                switch (request.cmd) {
                    case BBCmd.EXPAND:
                        return yield* this.handleExpandStreaming(request, options);
                    case BBCmd.TAG:
                        return yield* this.handleTagStreaming(request);
                    default:
                        throw new AppError(
                            ErrorCode.UNKNOWN_ERROR,
                            `BB cannot handle streaming command '${request.cmd}' right now. Only EXPAND and TAG commands support streaming.`,
                            `Unsupported streaming command: ${request.cmd}`,
                        );
                }
            } catch (error) {
                if (options.onError) {
                    options.onError(error as Error);
                }
                
                if (error instanceof AppError) {
                    throw error;
                }
                throw new AppError(
                    ErrorCode.UNKNOWN_ERROR,
                    'BB streaming encountered an unexpected error.',
                    error instanceof Error ? error.message : 'Unknown error',
                );
            }
        }.bind(this);

        return generator();
    }

    public async actStreamingSimple(request: Bquest): Promise<AsyncGenerator<string, Bsponse, unknown>> {
        return this.actStreaming(request);
    }

    /**
     * 处理扩写命令
     */
    private async handleExpand(request: Bquest): Promise<Bsponse> {
        const expander = Expander.getInstance();
        const result = await expander.handleExpansion({
            selectText: request.selectText,
            filePath: request.filePath,
            msg: request.msg
        });
        return {
            replaceText: result.replaceText
        };
    }

    /**
     * 处理翻译命令
     */
    private async handleTranslate(request: Bquest): Promise<Bsponse> {
        const translator = Translator.getInstance();
        const result = await translator.handleTranslation({
            selectText: request.selectText,
            filePath: request.filePath,
            msg: request.msg
        });
        return {
            replaceText: result.replaceText
        };
    }

    /**
     * 处理TLDR命令
     */
    private async handleTldr(request: Bquest): Promise<Bsponse> {
        const tldrGenerator = TldrGenerator.getInstance();
        const result = await tldrGenerator.handleTldrGeneration({
            selectText: request.selectText,
            filePath: request.filePath,
            msg: request.msg
        });
        return {
            replaceText: result.replaceText
        };
    }

    /**
     * 处理关键词命令
     */
    private async handleKeyword(request: Bquest): Promise<Bsponse> {
        const keywordExtractor = KeywordExtractor.getInstance();
        const result = await keywordExtractor.handleKeywordExtraction({
            selectText: request.selectText,
            filePath: request.filePath,
            msg: request.msg
        });
        return {
            replaceText: result.replaceText
        };
    }

    /**
     * 处理Mermaid命令
     */
    private async handleMermaid(request: Bquest): Promise<Bsponse> {
        const mermaidGenerator = MermaidGenerator.getInstance();
        const result = await mermaidGenerator.handleMermaidGeneration({
            selectText: request.selectText,
            filePath: request.filePath,
            msg: request.msg
        });
        return {
            replaceText: result.replaceText
        };
    }

    /**
     * 处理文本润色命令
     */
    private async handleImprove(request: Bquest): Promise<Bsponse> {
        const textImprover = TextImprover.getInstance();
        const result = await textImprover.handleTextImprovement({
            selectText: request.selectText,
            filePath: request.filePath,
            msg: request.msg
        });
        return {
            replaceText: result.replaceText
        };
    }

    /**
     * 处理通用任务命令
     */
    private async handleNormal(request: Bquest): Promise<Bsponse> {
        const normalProcessor = NormalProcessor.getInstance();
        const result = await normalProcessor.handleNormalTask({
            selectText: request.selectText,
            filePath: request.filePath,
            msg: request.msg
        });
        return {
            replaceText: result.replaceText
        };
    }

    /**
     * 处理标签命令
     */
    private async handleTag(_request: Bquest): Promise<Bsponse> {
        return { replaceText: '[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/SandyKidYao/blogbuddy)' };
    }

    /**
     * 处理流式扩写命令
     */
    private async *handleExpandStreaming(
        request: Bquest,
        options: StreamingActOptions
    ): AsyncGenerator<string, Bsponse, unknown> {
        const expander = Expander.getInstance();
        
        const streamingOptions: StreamingExpansionOptions = {
            onChunk: options.onChunk,
            onProgress: options.onProgress,
            onError: options.onError
        };

        const streamGenerator = await expander.handleExpansionStreaming({
            selectText: request.selectText,
            filePath: request.filePath,
            msg: request.msg
        }, streamingOptions);

        let finalResult: Bsponse = { replaceText: request.selectText };
        let fullText = '';

        try {
            for await (const chunk of streamGenerator) {
                fullText += chunk;
                yield chunk;
            }
            
            finalResult = { replaceText: fullText };
            if (options.onComplete) {
                options.onComplete(finalResult);
            }
        } catch (error) {
            if (options.onError) {
                options.onError(error as Error);
            }
            throw error;
        }

        return finalResult;
    }

    /**
     * 处理流式标签命令 - 模拟流式输出
     */
    private async *handleTagStreaming(_request: Bquest): AsyncGenerator<string, Bsponse, unknown> {
        const tagText = '[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/SandyKidYao/blogbuddy)';
        const chunks = tagText.split('');
        
        for (const char of chunks) {
            await this.delay(20);
            yield char;
        }

        return { replaceText: tagText };
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
