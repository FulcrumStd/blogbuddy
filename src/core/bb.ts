import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { Translator } from './translator';
import { Expander } from './expander';
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
}
