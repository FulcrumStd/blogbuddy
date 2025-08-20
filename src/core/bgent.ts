import OpenAI from "openai";
import { BBCmd } from "./constants";
import { ConfigService } from "../services/ConfigService";
import { AppError, ErrorCode } from "../utils/ErrorHandler";
import { Utils } from "../utils/helpers";
import { getCoreSystemPrompt, getExpandTextPrompt, getNormalTextPrompt } from "./prompt";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

export class BB {
    private static instance: BB = new BB();
    private constructor() { }
    public static i(): BB {
        return BB.instance;
    }

    public async act(text: string, cmd: BBCmd, msg: string): Promise<string> {
        const config = ConfigService.getInstance().getAllConfig();
        const client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl
        });

        const messages: Array<ChatCompletionMessageParam> = [{ role: "system", content: getCoreSystemPrompt() }];
        switch (cmd) {
            case BBCmd.NORMAL:
                messages.push({ role: "user", content: getNormalTextPrompt(text) });
                break;
            case BBCmd.EXPAND:
                messages.push({ role: "user", content: getExpandTextPrompt(text) });
                break;
            case BBCmd.CHECK:
            case BBCmd.MERMAID:
            case BBCmd.USAGE:
                throw new AppError(
                    ErrorCode.UNKNOWN_ERROR,
                    "BB cannot do " + cmd + "right now.",
                    "BB cannot do " + cmd + "right now.",
                );
        }

        if (!Utils.isEmpty(msg)) {
            messages.push({ role: "user", content: msg });
        }

        const completion = await client.chat.completions.create({
            model: config.model,
            messages: messages
        });

        const response = completion.choices[0].message.content;
        if (!response) {
            throw new AppError(
                ErrorCode.UNKNOWN_ERROR,
                "BB ate it but said nothing.",
                "BB ate it but said nothing",
            );
        }
        return response;
    }

}
