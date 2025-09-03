import OpenAI from 'openai';
import { ConfigService } from './ConfigService';
import { PricingService } from './PricingService';
import { ChatCompletionCreateParams, ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';


export interface UsageStats {
    totalRequests: number;
    totalTokensUsed: number;
    totalCost?: number; // Total cost in USD, only available if pricing data is accessible
    flagStats: Map<string, {
        requests: number;
        tokensUsed: number;
        model: string;
        cost?: number; // Cost in USD, only available if pricing data is accessible
    }>;
    modelStats: Map<string, {
        requests: number;
        tokensUsed: number;
        cost?: number; // Cost in USD, only available if pricing data is accessible
    }>;
}

export interface AIServiceConfig {
    apiKey: string;
    baseURL?: string;
    model: string;
}

export class AIService {
    private static instance: AIService;
    private client: OpenAI | null = null;
    private usageStats: UsageStats;
    private pricingService: PricingService;

    private constructor() {
        this.usageStats = {
            totalRequests: 0,
            totalTokensUsed: 0,
            totalCost: 0,
            flagStats: new Map(),
            modelStats: new Map()
        };
        this.pricingService = PricingService.getInstance();
    }

    public static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
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

    private updateUsageStats(
        flag: string, 
        model: string, 
        tokensUsed: number = 0,
        promptTokens: number = 0,
        completionTokens: number = 0
    ): void {
        this.usageStats.totalRequests++;
        this.usageStats.totalTokensUsed += tokensUsed;

        // Calculate cost if pricing is available
        let cost: number | undefined;
        const costCalculation = this.pricingService.calculateCost(model, promptTokens, completionTokens);
        if (costCalculation) {
            cost = costCalculation.totalCost;
            this.usageStats.totalCost = (this.usageStats.totalCost || 0) + cost;
        }

        // Update flag stats
        if (!this.usageStats.flagStats.has(flag)) {
            this.usageStats.flagStats.set(flag, {
                requests: 0,
                tokensUsed: 0,
                model: model,
                cost: 0
            });
        }

        const flagStat = this.usageStats.flagStats.get(flag)!;
        flagStat.requests++;
        flagStat.tokensUsed += tokensUsed;
        flagStat.model = model; // Update to latest model used for this flag
        if (cost !== undefined) {
            flagStat.cost = (flagStat.cost || 0) + cost;
        }

        // Update model stats
        if (!this.usageStats.modelStats.has(model)) {
            this.usageStats.modelStats.set(model, {
                requests: 0,
                tokensUsed: 0,
                cost: 0
            });
        }

        const modelStat = this.usageStats.modelStats.get(model)!;
        modelStat.requests++;
        modelStat.tokensUsed += tokensUsed;
        if (cost !== undefined) {
            modelStat.cost = (modelStat.cost || 0) + cost;
        }
    }

    public async chat(
        messages: ChatCompletionMessageParam[], 
        flag: string,
        model?: string
    ): Promise<string> {
        this.initializeClient();
        const config = ConfigService.getInstance().getAllConfig();
        
        const selectedModel = model || config.model;

        try {
            const response = await this.client!.chat.completions.create({
                model: selectedModel,
                messages: messages,
                stream: false
            }) as OpenAI.Chat.Completions.ChatCompletion;
            
            const tokensUsed = response.usage?.total_tokens || 0;
            const promptTokens = response.usage?.prompt_tokens || 0;
            const completionTokens = response.usage?.completion_tokens || 0;
            const responseModel = response.model || selectedModel || 'unknown';
            this.updateUsageStats(flag, responseModel, tokensUsed, promptTokens, completionTokens);

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response content received from AI');
            }
            
            return content;
        } catch (error) {
            this.updateUsageStats(flag, selectedModel || 'unknown', 0, 0, 0);
            throw error;
        }
    }

    public async chatStreaming(
        messages: ChatCompletionMessageParam[],
        flag: string,
        model?: string
    ): Promise<AsyncGenerator<string, string, unknown>> {
        this.initializeClient();
        const config = ConfigService.getInstance().getAllConfig();

        const params: ChatCompletionCreateParams = {
            model: model || config.model,
            messages: messages,
            stream: true
        };

        let fullResponse = '';
        let totalTokens = 0;
        let promptTokens = 0;
        let completionTokens = 0;

        const generator = async function* (this: AIService): AsyncGenerator<string, string, unknown> {
            try {
                const stream = await this.client!.chat.completions.create(params);
                
                for await (const chunk of stream) {
                    const delta = chunk.choices[0]?.delta?.content;
                    
                    if (delta) {
                        fullResponse += delta;
                        yield delta;
                    }
                    
                    if (chunk.usage) {
                        totalTokens = chunk.usage.total_tokens;
                        promptTokens = chunk.usage.prompt_tokens || 0;
                        completionTokens = chunk.usage.completion_tokens || 0;
                    }
                }

                const model = params.model || 'unknown';
                this.updateUsageStats(flag, model, totalTokens, promptTokens, completionTokens);
                
                return fullResponse;

            } catch (error) {
                const model = params.model || 'unknown';
                this.updateUsageStats(flag, model, 0, 0, 0);
                throw error;
            }
        }.bind(this);

        return generator();
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

    public isPricingAvailable(): boolean {
        return this.pricingService.isPricingAvailable();
    }

    public async refreshPricing(): Promise<boolean> {
        return await this.pricingService.refreshPricing();
    }

    public getPricingDataAge(): number {
        return this.pricingService.getPricingDataAge();
    }

    public getSupportedModels(): string[] {
        return this.pricingService.getAllAvailableModels();
    }
}