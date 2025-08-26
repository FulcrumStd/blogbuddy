export interface ModelPricing {
    promptPrice: number; // Price per 1K tokens for input
    completionPrice: number; // Price per 1K tokens for output
    lastUpdated: number; // Timestamp of last price update
}

export interface PricingData {
    [modelName: string]: ModelPricing;
}

export interface CostCalculation {
    promptCost: number;
    completionCost: number;
    totalCost: number;
}

export class PricingService {
    private static instance: PricingService;
    private pricingData: PricingData = {};
    private pricesAvailable: boolean = false;
    private lastFetchAttempt: number = 0;
    private readonly FETCH_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

    private constructor() {
        this.initializePricing();
    }

    public static getInstance(): PricingService {
        if (!PricingService.instance) {
            PricingService.instance = new PricingService();
        }
        return PricingService.instance;
    }

    private async initializePricing(): Promise<void> {
        await this.fetchOnlinePricing();
    }

    private async fetchOnlinePricing(): Promise<void> {
        const now = Date.now();
        
        // Check cooldown period
        if (now - this.lastFetchAttempt < this.FETCH_COOLDOWN) {
            return;
        }

        this.lastFetchAttempt = now;

        try {
            // Try to fetch from OpenRouter API (they provide pricing info)
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updatePricingFromOpenRouter(data);
                this.pricesAvailable = true;
                console.log('Successfully loaded pricing data for', Object.keys(this.pricingData).length, 'models');
            } else {
                console.warn('Failed to fetch online pricing data');
                this.pricesAvailable = false;
                this.pricingData = {};
            }
        } catch (error) {
            console.warn('Error fetching online pricing data:', error);
            this.pricesAvailable = false;
            this.pricingData = {};
        }
    }

    private updatePricingFromOpenRouter(data: any): void {
        try {
            this.pricingData = {}; // Clear existing data
            
            if (data.data && Array.isArray(data.data)) {
                for (const model of data.data) {
                    if (model.id && model.pricing) {
                        const promptPrice = parseFloat(model.pricing.prompt) * 1000; // Convert to per 1K tokens
                        const completionPrice = parseFloat(model.pricing.completion) * 1000;
                        
                        if (!isNaN(promptPrice) && !isNaN(completionPrice)) {
                            this.pricingData[model.id] = {
                                promptPrice,
                                completionPrice,
                                lastUpdated: Date.now()
                            };
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Error parsing online pricing data:', error);
            this.pricingData = {};
            this.pricesAvailable = false;
        }
    }

    public isPricingAvailable(): boolean {
        return this.pricesAvailable;
    }

    public getModelPricing(modelName: string): ModelPricing | null {
        if (!this.pricesAvailable) {
            return null;
        }

        // Try exact match first
        if (this.pricingData[modelName]) {
            return this.pricingData[modelName];
        }

        // Try partial matches for common patterns
        const normalizedModel = this.normalizeModelName(modelName);
        for (const [key, pricing] of Object.entries(this.pricingData)) {
            if (this.normalizeModelName(key) === normalizedModel) {
                return pricing;
            }
        }

        return null;
    }

    private normalizeModelName(modelName: string): string {
        return modelName
            .toLowerCase()
            .replace(/^(openai|anthropic|google|meta|mistral)\//, '') // Remove provider prefix
            .replace(/-\d{4}-\d{2}-\d{2}$/, '') // Remove date suffix
            .replace(/-preview$/, '') // Remove preview suffix
            .replace(/-latest$/, ''); // Remove latest suffix
    }

    public calculateCost(
        modelName: string, 
        promptTokens: number, 
        completionTokens: number
    ): CostCalculation | null {
        const pricing = this.getModelPricing(modelName);
        
        if (!pricing) {
            return null;
        }

        const promptCost = (promptTokens / 1000) * pricing.promptPrice;
        const completionCost = (completionTokens / 1000) * pricing.completionPrice;
        const totalCost = promptCost + completionCost;

        return {
            promptCost: Math.round(promptCost * 100000) / 100000, // Round to 5 decimal places
            completionCost: Math.round(completionCost * 100000) / 100000,
            totalCost: Math.round(totalCost * 100000) / 100000
        };
    }

    public getAllAvailableModels(): string[] {
        return Object.keys(this.pricingData);
    }

    public async refreshPricing(): Promise<boolean> {
        this.lastFetchAttempt = 0; // Reset cooldown
        await this.fetchOnlinePricing();
        return this.pricesAvailable;
    }

    public getPricingDataAge(): number {
        if (!this.pricesAvailable || Object.keys(this.pricingData).length === 0) {
            return -1; // Indicate no pricing data available
        }

        const now = Date.now();
        let oldestUpdate = now;
        
        for (const pricing of Object.values(this.pricingData)) {
            if (pricing.lastUpdated < oldestUpdate) {
                oldestUpdate = pricing.lastUpdated;
            }
        }
        
        return Math.floor((now - oldestUpdate) / (1000 * 60));
    }
}