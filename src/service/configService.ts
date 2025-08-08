import * as vscode from 'vscode';

export class ConfigService {
    private static instance: ConfigService;
    private readonly configSection = 'blogbuddy';

    private constructor() {}

    public static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    /**
     * 获取配置项的值
     */
    public get<T>(key: string, defaultValue?: T): T {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get<T>(key, defaultValue as T);
    }

    /**
     * 设置配置项的值
     */
    public async set(key: string, value: any, target?: vscode.ConfigurationTarget): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        await config.update(key, value, target || vscode.ConfigurationTarget.Global);
    }

    /**
     * 获取所有配置
     */
    public getAllConfig() {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return {
            apiKey: this.get<string>('apiKey', ''),
            model: this.get<string>('model', 'gpt-3.5-turbo'),
            temperature: this.get<number>('temperature', 0.7),
            autoSave: this.get<boolean>('autoSave', false)
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
            errors.push('API密钥未设置，请在设置中配置');
        }

        // 验证temperature
        if (config.temperature < 0 || config.temperature > 2) {
            errors.push('temperature必须在0-2之间');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * 重置所有配置为默认值
     */
    public async resetToDefaults(): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.configSection);
        
        await config.update('apiKey', '', vscode.ConfigurationTarget.Global);
        await config.update('model', 'gpt-3.5-turbo', vscode.ConfigurationTarget.Global);
        await config.update('temperature', 0.7, vscode.ConfigurationTarget.Global);
        await config.update('autoSave', false, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage('配置已重置为默认值');
    }
}
