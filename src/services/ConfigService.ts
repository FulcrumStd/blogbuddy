import * as vscode from 'vscode';

export enum ConfigKey {
    API_KEY = 'apiKey',
    MODEL = 'model',
    BASE_URL = 'baseURL',
    MERMAID_CODE = 'mermaidCode'
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
    public get<T>(key: ConfigKey, defaultValue?: T): T {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get<T>(key, defaultValue as T);
    }

    /**
     * 获取所有配置
     */
    public getAllConfig() {
        return {
            apiKey: this.get<string>(ConfigKey.API_KEY, ''),
            model: this.get<string>(ConfigKey.MODEL, ''),
            baseURL: this.get<string>(ConfigKey.BASE_URL, ''),
            mermaidCode: this.get<boolean>(ConfigKey.MERMAID_CODE, false)
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
