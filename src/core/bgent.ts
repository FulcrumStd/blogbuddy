import { BBCmd } from './constants';
import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { Utils } from '../utils/helpers';
import { getCoreSystemPrompt, getExpandTextPrompt, getNormalTextPrompt } from './prompt';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { AIProxy } from '../utils/aiProxy';

export interface Bquest {
    selectText: string, // 包含 BBCmd 的文本
    filePath:string,    // 文本所在文件的路径
    cmd: BBCmd,         // 指令
    msg: string,        // 用户的附加消息
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
        const messages: Array<ChatCompletionMessageParam> = [{ role: 'system', content: getCoreSystemPrompt() }];
        
        switch (request.cmd) {
            case BBCmd.NORMAL:
                messages.push({ role: 'user', content: getNormalTextPrompt(request.selectText) });
                break;
            case BBCmd.EXPAND:
                messages.push({ role: 'user', content: getExpandTextPrompt(request.selectText) });
                break;
            case BBCmd.TAG:
                return {replaceText: this.tag()};
            default:
                throw new AppError(
                    ErrorCode.UNKNOWN_ERROR,
                    'BB cannot do ' + request.cmd + 'right now.',
                    'BB cannot do ' + request.cmd + 'right now.',
                );
        }

        if (!Utils.isEmpty(request.msg)) {
            messages.push({ role: 'user', content: request.msg });
        }

        try {
            const aiProxy = AIProxy.getInstance();
            const replaceText = await aiProxy.chat(messages, request.cmd);
            return { replaceText };
        } catch (error) {
            throw new AppError(
                ErrorCode.UNKNOWN_ERROR,
                'BB ate it but said nothing.',
                'BB ate it but said nothing',
            );
        }
    }

    tag(): string {
        return '[![Gemini CLI CI](https://github.com/google-gemini/gemini-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/google-gemini/gemini-cli/actions/workflows/ci.yml)';
    }
}
