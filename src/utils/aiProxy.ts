import OpenAI from 'openai';
import { ConfigService } from '../services/ConfigService';
import { ChatCompletionCreateParams, ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';

export interface StreamingChatOptions {
    onChunk?: (chunk: string) => void;
    onComplete?: (fullResponse: string) => void;
    onError?: (error: Error) => void;
}

export interface UsageStats {
    totalRequests: number;
    totalTokensUsed: number;
    flagStats: Map<string, {
        requests: number;
        tokensUsed: number;
        model: string;
    }>;
    modelStats: Map<string, {
        requests: number;
        tokensUsed: number;
    }>;
}

export interface AIProxyConfig {
    apiKey: string;
    baseURL?: string;
    model: string;
}

export class AIProxy {
    private static instance: AIProxy;
    private client: OpenAI | null = null;
    private usageStats: UsageStats;

    private constructor() {
        this.usageStats = {
            totalRequests: 0,
            totalTokensUsed: 0,
            flagStats: new Map(),
            modelStats: new Map()
        };
    }

    public static getInstance(): AIProxy {
        if (!AIProxy.instance) {
            AIProxy.instance = new AIProxy();
        }
        return AIProxy.instance;
    }

    private initializeClient(): void {
        if (!this.client) {
            const config = ConfigService.getInstance().getAllConfig();
            this.client = new OpenAI({
                apiKey: config.apiKey,
                baseURL: config.baseURL
            });
        }
    }

    private updateUsageStats(flag: string, model: string, tokensUsed: number = 0): void {
        this.usageStats.totalRequests++;
        this.usageStats.totalTokensUsed += tokensUsed;

        // Update flag stats
        if (!this.usageStats.flagStats.has(flag)) {
            this.usageStats.flagStats.set(flag, {
                requests: 0,
                tokensUsed: 0,
                model: model
            });
        }

        const flagStat = this.usageStats.flagStats.get(flag)!;
        flagStat.requests++;
        flagStat.tokensUsed += tokensUsed;
        flagStat.model = model; // Update to latest model used for this flag

        // Update model stats
        if (!this.usageStats.modelStats.has(model)) {
            this.usageStats.modelStats.set(model, {
                requests: 0,
                tokensUsed: 0
            });
        }

        const modelStat = this.usageStats.modelStats.get(model)!;
        modelStat.requests++;
        modelStat.tokensUsed += tokensUsed;
    }

    public async chatCompletion(
        params: ChatCompletionCreateParams,
        flag: string
    ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
        this.initializeClient();

        try {
            const response = await this.client!.chat.completions.create({
                ...params,
                stream: false
            }) as OpenAI.Chat.Completions.ChatCompletion;
            
            const tokensUsed = response.usage?.total_tokens || 0;
            const model = response.model || params.model || 'unknown';
            this.updateUsageStats(flag, model, tokensUsed);

            return response;
        } catch (error) {
            const model = params.model || 'unknown';
            this.updateUsageStats(flag, model, 0);
            throw error;
        }
    }

    public async chat(
        messages: ChatCompletionMessageParam[], 
        flag: string
    ): Promise<string> {
        const config = ConfigService.getInstance().getAllConfig();
        
        const response = await this.chatCompletion({
            model: config.model,
            messages: messages
        }, flag);

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response content received from AI');
        }
        
        return content;
    }

    public async chatStreaming(
        messages: ChatCompletionMessageParam[],
        flag: string,
        options: StreamingChatOptions = {}
    ): Promise<AsyncGenerator<string, string, unknown>> {
        this.initializeClient();
        const config = ConfigService.getInstance().getAllConfig();

        const params: ChatCompletionCreateParams = {
            model: config.model,
            messages: messages,
            stream: true
        };

        let fullResponse = '';
        let totalTokens = 0;

        const generator = async function* (this: AIProxy): AsyncGenerator<string, string, unknown> {
            try {
                const stream = await this.client!.chat.completions.create(params);
                
                for await (const chunk of stream) {
                    const delta = chunk.choices[0]?.delta?.content;
                    
                    if (delta) {
                        fullResponse += delta;
                        
                        if (options.onChunk) {
                            options.onChunk(delta);
                        }
                        
                        yield delta;
                    }
                    
                    if (chunk.usage) {
                        totalTokens = chunk.usage.total_tokens;
                    }
                }

                const model = params.model || 'unknown';
                this.updateUsageStats(flag, model, totalTokens);
                
                if (options.onComplete) {
                    options.onComplete(fullResponse);
                }
                
                return fullResponse;

            } catch (error) {
                const model = params.model || 'unknown';
                this.updateUsageStats(flag, model, 0);
                
                if (options.onError) {
                    options.onError(error as Error);
                }
                
                throw error;
            }
        }.bind(this);

        return generator();
    }

    public async chatStreamingSimple(
        messages: ChatCompletionMessageParam[],
        flag: string
    ): Promise<AsyncGenerator<string, string, unknown>> {
        return this.chatStreaming(messages, flag);
    }

    public getUsageStats(): UsageStats {
        return {
            totalRequests: this.usageStats.totalRequests,
            totalTokensUsed: this.usageStats.totalTokensUsed,
            flagStats: new Map(this.usageStats.flagStats),
            modelStats: new Map(this.usageStats.modelStats)
        };
    }

    public getUsageStatsByFlag(flag: string): { requests: number; tokensUsed: number; model: string } | null {
        return this.usageStats.flagStats.get(flag) || null;
    }

    public getUsageStatsByModel(model: string): { requests: number; tokensUsed: number } | null {
        return this.usageStats.modelStats.get(model) || null;
    }

    public resetUsageStats(): void {
        this.usageStats.totalRequests = 0;
        this.usageStats.totalTokensUsed = 0;
        this.usageStats.flagStats.clear();
        this.usageStats.modelStats.clear();
    }

    public resetUsageStatsByFlag(flag: string): void {
        this.usageStats.flagStats.delete(flag);
    }

    public resetUsageStatsByModel(model: string): void {
        this.usageStats.modelStats.delete(model);
    }
}