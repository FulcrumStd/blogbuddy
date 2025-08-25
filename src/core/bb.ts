import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { Translator } from './translator';
import { Expander } from './expander';
import { TldrGenerator } from './tldr';
import { KeywordExtractor } from './keyword';
import { MermaidGenerator } from './mermaid';
import { TextImprover } from './improve';
import { NormalProcessor } from './normal';
import { ProcessRequest, ProcessResponse,BBCmd } from './types';


export class BB {
    tagText: string = '[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/SandyKidYao/blogbuddy)';
    private static instance: BB = new BB();
    private constructor() { }
    public static i(): BB {
        return BB.instance;
    }

    public async act(request: ProcessRequest): Promise<ProcessResponse> {
        try {
            switch (request.cmd) {
                case BBCmd.EXPAND:
                    return await Expander.getInstance().process(request);
                case BBCmd.TRANSLATE:
                    return await Translator.getInstance().process(request);
                case BBCmd.TLDR:
                    return await TldrGenerator.getInstance().process(request);
                case BBCmd.KEYWORD:
                    return await KeywordExtractor.getInstance().process(request);
                case BBCmd.MERMAID:
                    return await MermaidGenerator.getInstance().process(request);
                case BBCmd.IMPROVE:
                    return await TextImprover.getInstance().process(request);
                case BBCmd.NORMAL:
                    return await NormalProcessor.getInstance().process(request);
                case BBCmd.TAG:
                    return { replaceText: this.tagText };
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

    public async actStreaming(request: ProcessRequest): Promise<AsyncGenerator<string, ProcessResponse, unknown>> {
        const generator = async function* (this: BB): AsyncGenerator<string, ProcessResponse, unknown> {
            switch (request.cmd) {
                case BBCmd.EXPAND:
                    return yield* await Expander.getInstance().processStreaming(request);
                case BBCmd.TRANSLATE:
                    const result = await Translator.getInstance().process(request);
                    yield result.replaceText;
                    return result;
                case BBCmd.TAG:
                    yield this.tagText;
                    return { replaceText: this.tagText };
                default:
                    throw new AppError(
                        ErrorCode.UNKNOWN_ERROR,
                        `BB cannot handle streaming command '${request.cmd}' right now. Only EXPAND and TAG commands support streaming.`,
                        `Unsupported command: ${request.cmd}`,
                    );
            }
        }.bind(this);

        return generator();
    }

}
