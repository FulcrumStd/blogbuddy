import * as vscode from 'vscode';
import type { EditorDocumentStats } from './webviewProtocol';

/** Publishes the focused webview's live document statistics to VS Code UI. */
class EditorStatus {
    private active?: string;
    private readonly documents = new Map<string, EditorDocumentStats>();
    private readonly emitter = new vscode.EventEmitter<void>();
    readonly onDidChange = this.emitter.event;

    get current(): EditorDocumentStats | undefined {
        return this.active ? this.documents.get(this.active) : undefined;
    }

    activate(id: string, active: boolean): void {
        if (active) { this.active = id; }
        else if (this.active === id) { this.active = undefined; }
        this.emitter.fire();
    }

    update(id: string, stats: EditorDocumentStats): void {
        this.documents.set(id, stats);
        if (this.active === id) { this.emitter.fire(); }
    }

    remove(id: string): void {
        this.documents.delete(id);
        this.activate(id, false);
    }
}

export const editorStatus = new EditorStatus();
