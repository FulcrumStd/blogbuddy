import * as vscode from 'vscode';
import { ConfigService } from './ConfigService';

/**
 * Surfaces a warning when a config change leaves the extension in an invalid state
 * (missing API key, base URL, or model). Silent on valid changes.
 */
export class ConfigWatcher implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];
    private configService: ConfigService;

    constructor() {
        this.configService = ConfigService.getInstance();
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration('blogbuddy')) {
                    this.onConfigurationChanged();
                }
            }),
        );
    }

    private onConfigurationChanged(): void {
        const validation = this.configService.validateConfig();
        if (!validation.isValid) {
            vscode.window.showWarningMessage(
                `BlogBuddy config: ${validation.errors.join(', ')}`,
            );
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
