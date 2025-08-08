import * as vscode from 'vscode';
import { ConfigService } from './configService';

export class ConfigWatcher {
    private disposables: vscode.Disposable[] = [];
    private configService: ConfigService;

    constructor() {
        this.configService = ConfigService.getInstance();
        this.setupWatcher();
    }

    private setupWatcher() {
        // 监听配置变化
        const watcher = vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('blogbuddy')) {
                this.onConfigurationChanged(event);
            }
        });

        this.disposables.push(watcher);
    }

    private onConfigurationChanged(event: vscode.ConfigurationChangeEvent) {
        console.log('配置发生变化');

        // 检查哪些配置项发生了变化
        const changedKeys: string[] = [];
        
        if (event.affectsConfiguration('blogbuddy.apiKey')) {
            changedKeys.push('API密钥');
        }
        if (event.affectsConfiguration('blogbuddy.model')) {
            changedKeys.push('AI模型');
        }
        if (event.affectsConfiguration('blogbuddy.temperature')) {
            changedKeys.push('创造性程度');
        }

        // 验证新配置
        const validation = this.configService.validateConfig();
        if (!validation.isValid) {
            vscode.window.showWarningMessage(
                `配置验证失败: ${validation.errors.join(', ')}`
            );
        } else if (changedKeys.length > 0) {
            const enableNotifications = this.configService.get<boolean>('enableNotifications', true);
            if (enableNotifications) {
                vscode.window.showInformationMessage(
                    `配置已更新: ${changedKeys.join(', ')}`
                );
            }
        }
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
