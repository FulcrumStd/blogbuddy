import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { Translator } from './translator';
import { Expander } from './expander';
import { TldrGenerator } from './tldr';
import { KeywordExtractor } from './keyword';
import { MermaidGenerator } from './mermaid';
import { TextImprover } from './improve';
import { NormalProcessor } from './normal';
import { ProcessRequest, ProcessResponse, BBCmd, ProcessChunk } from './types';
import { Utils } from '../utils/helpers';


export class BB {
    tagText: string = '[![BB](https://img.shields.io/badge/created_with-BB-FFD900)](https://github.com/FulcrumStd/blogbuddy)';
    private static instance: BB = new BB();
    private constructor() { }
    public static i(): BB {
        return BB.instance;
    }

    public async act(request: ProcessRequest): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const self = this;
        const generator = async function* (): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            switch (request.cmd) {
                case BBCmd.EXPAND:
                    return yield* await Expander.getInstance().process(request);
                case BBCmd.KEYWORD:
                    return yield* await KeywordExtractor.getInstance().process(request);
                case BBCmd.TLDR:
                    return yield* await TldrGenerator.getInstance().process(request);
                case BBCmd.IMPROVE:
                    return yield* await TextImprover.getInstance().process(request);
                case BBCmd.NORMAL:
                    return yield* await NormalProcessor.getInstance().process(request);
                case BBCmd.MERMAID:
                    return yield* await MermaidGenerator.getInstance().process(request);
                case BBCmd.TRANSLATE:
                    return yield* await Translator.getInstance().process(request);
                case BBCmd.TAG: {
                    const text = self.generateTag(request);
                    yield { text };
                    return { replaceText: text };
                }
                default:
                    throw new AppError(
                        ErrorCode.UNKNOWN_ERROR,
                        `BB cannot handle command '${request.cmd}' right now.`,
                        `Unsupported command: ${request.cmd}`,
                    );
            }
        };

        return generator();
    }

    private generateTag(request: ProcessRequest): string {
        if (Utils.isEmpty(request.selectText)) {
            return this.tagText;
        }
        return `${request.selectText}\n${this.tagText}`;
    }
}
