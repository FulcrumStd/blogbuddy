import * as vscode from 'vscode';

export enum ConfigKey {
    API_KEY = 'apiKey',
    MODEL = 'model',
    SMALL_MODEL = 'smallModel',
    BASE_URL = 'baseURL',
    MERMAID_SVG = 'mermaidSVG',
    STREAMING = 'streaming'
}


export class ConfigService {
    private static instance: ConfigService;
    private readonly configSection = 'blogbuddy';

    private constructor() { }

    public static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    /**
     * 获取配置项的值
     */
    private get<T>(key: ConfigKey, defaultValue?: T): T {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get<T>(key, defaultValue as T);
    }

    /**
     * 获取所有配置
     */
    public getAllConfig() {
        const model = this.get<string>(ConfigKey.MODEL, '');
        const smallModel = this.get<string>(ConfigKey.SMALL_MODEL, '');
        
        return {
            apiKey: this.get<string>(ConfigKey.API_KEY, ''),
            model: model,
            smallModel: (!smallModel || smallModel.trim() === '') ? model : smallModel,
            baseURL: this.get<string>(ConfigKey.BASE_URL, ''),
            mermaidSVG: this.get<boolean>(ConfigKey.MERMAID_SVG, false),
            streaming: this.get<boolean>(ConfigKey.STREAMING, true),
        };
    }

    /**
     * 验证配置是否有效
     */
    public validateConfig(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const config = this.getAllConfig();

        // 验证API密钥
        if (!config.apiKey || config.apiKey.trim() === '') {
            errors.push('API key is not setting');
        }

        // 验证API密钥
        if (!config.baseURL || config.baseURL.trim() === '') {
            errors.push('API base url is not setting');
        }

        // 验证API密钥
        if (!config.model || config.model.trim() === '') {
            errors.push('Model is not setting');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
