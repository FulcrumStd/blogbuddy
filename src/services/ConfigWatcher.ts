import * as vscode from 'vscode';
import { ConfigService } from './ConfigService';

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
        const validation = this.configService.validateConfig();
        if (!validation.isValid) {
            vscode.window.showWarningMessage(
                `配置验证失败: ${validation.errors.join(', ')}`
            );
        }
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
