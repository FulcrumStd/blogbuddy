import * as vscode from 'vscode';

export enum ConfigKey {
    API_KEY = 'apiKey',
    MODEL = 'model',
    BASE_URL = 'baseURL',
    ASSET_DIR = 'assetDir',
}

export interface ResolvedConfig {
    apiKey: string;
    model: string;
    baseURL: string;
    assetDir: string;
}

/** Final fallback when neither settings nor env vars provide a baseURL. */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export type ResolutionSource =
    | 'settings'
    | 'env:BLOGBUDDY_API_KEY'
    | 'env:OPENAI_API_KEY'
    | 'env:BLOGBUDDY_BASE_URL'
    | 'env:OPENAI_BASE_URL'
    | 'default'
    | 'none';

export interface ConfigSources {
    apiKey: ResolutionSource;
    baseURL: ResolutionSource;
    model: ResolutionSource;
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

    private get<T>(key: ConfigKey, defaultValue?: T): T {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get<T>(key, defaultValue as T);
    }

    // ---- Env var fallback ----
    // Priority: settings value (if non-empty) → BLOGBUDDY_* → OPENAI_* → ''
    private resolveSecret(configValue: string, bbKey: string, openaiKey: string): string {
        if (configValue && configValue.trim() !== '') { return configValue; }
        const env = (typeof process !== 'undefined' && process.env) || {};
        return (env[bbKey] || env[openaiKey] || '').trim();
    }

    public getAllConfig(): ResolvedConfig {
        const apiKeyRaw = this.get<string>(ConfigKey.API_KEY, '');
        const baseURLRaw = this.get<string>(ConfigKey.BASE_URL, '');
        return {
            apiKey: this.resolveSecret(apiKeyRaw, 'BLOGBUDDY_API_KEY', 'OPENAI_API_KEY'),
            // baseURL always has a value: settings → BLOGBUDDY_* → OPENAI_* → OpenAI official.
            baseURL: this.resolveSecret(baseURLRaw, 'BLOGBUDDY_BASE_URL', 'OPENAI_BASE_URL')
                || DEFAULT_BASE_URL,
            model: this.get<string>(ConfigKey.MODEL, ''),
            assetDir: this.get<string>(ConfigKey.ASSET_DIR, ''),
        };
    }

    public validateConfig(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const config = this.getAllConfig();

        if (!config.apiKey) {
            errors.push('API key is not set (configure blogbuddy.apiKey or set BLOGBUDDY_API_KEY / OPENAI_API_KEY)');
        }
        if (!config.model) {
            errors.push('Model is not set (configure blogbuddy.model or run "BlogBuddy: Select Model")');
        }

        return { isValid: errors.length === 0, errors };
    }

    public async setModel(model: string): Promise<void> {
        await vscode.workspace.getConfiguration(this.configSection).update(
            ConfigKey.MODEL,
            model,
            vscode.ConfigurationTarget.Global,
        );
    }

    /** Reports where each resolved value came from. Used by the status bar /
     *  diagnostics UI so the user can see settings-vs-env-vs-default at a glance. */
    public getSources(): ConfigSources {
        const env = (typeof process !== 'undefined' && process.env) || {};
        const isSet = (v: string | undefined) => !!(v && v.trim() !== '');

        const apiKeyCfg = this.get<string>(ConfigKey.API_KEY, '');
        const baseURLCfg = this.get<string>(ConfigKey.BASE_URL, '');
        const modelCfg = this.get<string>(ConfigKey.MODEL, '');

        const apiKey: ResolutionSource = isSet(apiKeyCfg)
            ? 'settings'
            : isSet(env.BLOGBUDDY_API_KEY)
                ? 'env:BLOGBUDDY_API_KEY'
                : isSet(env.OPENAI_API_KEY)
                    ? 'env:OPENAI_API_KEY'
                    : 'none';

        const baseURL: ResolutionSource = isSet(baseURLCfg)
            ? 'settings'
            : isSet(env.BLOGBUDDY_BASE_URL)
                ? 'env:BLOGBUDDY_BASE_URL'
                : isSet(env.OPENAI_BASE_URL)
                    ? 'env:OPENAI_BASE_URL'
                    : 'default';

        const model: ResolutionSource = isSet(modelCfg) ? 'settings' : 'none';

        return { apiKey, baseURL, model };
    }
}
