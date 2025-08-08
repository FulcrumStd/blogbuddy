import { ConfigService } from '../service/configService';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export class ConfigValidator {
    private configService: ConfigService;

    constructor() {
        this.configService = ConfigService.getInstance();
    }

    public validateFullConfiguration(): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        const config = this.configService.getAllConfig();

        // 必需项检查
        this.validateRequired(config, result);
        // 数值范围检查
        this.validateRanges(config, result);
        // 格式检查
        this.validateFormats(config, result);

        result.isValid = result.errors.length === 0;
        return result;
    }

    private validateRequired(config: any, result: ValidationResult) {
        if (!config.apiKey || config.apiKey.trim() === '') {
            result.errors.push('API密钥是必需的，请在设置中配置');
        } else if (!config.apiKey.startsWith('sk-')) {
            result.warnings.push('API密钥格式可能不正确，通常以sk-开头');
        }
    }

    private validateRanges(config: any, result: ValidationResult) {
        if (config.temperature < 0 || config.temperature > 2) {
            result.errors.push('创造性程度(temperature)必须在0-2之间');
        }
    }

    private validateFormats(config: any, result: ValidationResult) {
        const validModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
        if (!validModels.includes(config.model)) {
            result.errors.push(`不支持的AI模型: ${config.model}`);
        }

    }
}
