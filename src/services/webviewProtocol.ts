/**
 * Webview ↔ Extension Host 消息协议类型定义
 */

// ===== Webview → Extension Host =====

export interface WebviewReadyMessage {
    type: 'ready';
}

export interface WebviewBBRequestMessage {
    type: 'bb-request';
    id: string;
    cmd: string;
    selectText: string;
    msg: string;
}

export interface WebviewBBCancelMessage {
    type: 'bb-cancel';
    id: string;
}

export interface WebviewSaveMessage {
    type: 'save';
    content: string;
}

export interface WebviewOpenFileMessage {
    type: 'open-file';
}

export interface WebviewNewFileMessage {
    type: 'new-file';
}

export interface WebviewDirtyMessage {
    type: 'dirty';
    isDirty: boolean;
}

export interface WebviewAutoSaveMessage {
    type: 'auto-save';
    content: string;
}

export interface WebviewFileUploadMessage {
    type: 'file-upload';
    uploadId: string;
    fileName: string;
    mimeType: string;
    dataBase64: string;
}

export interface WebviewFrontmatterUpdateMessage {
    type: 'frontmatter-update';
    frontmatter: string;
}

export interface WebviewOpenSourceMessage {
    type: 'open-source';
}

export interface WebviewConflictResolveMessage {
    type: 'conflict-resolve';
    choice: 'reload' | 'keep';
}

export interface WebviewReaderDispatchMessage {
    type: 'reader-dispatch';
    cmd: string;
    msg: string;
    content: string;   // full Markdown with the render tag already removed
}

export type WebviewMessage =
    | WebviewReadyMessage
    | WebviewBBRequestMessage
    | WebviewBBCancelMessage
    | WebviewSaveMessage
    | WebviewOpenFileMessage
    | WebviewNewFileMessage
    | WebviewDirtyMessage
    | WebviewAutoSaveMessage
    | WebviewFileUploadMessage
    | WebviewFrontmatterUpdateMessage
    | WebviewOpenSourceMessage
    | WebviewConflictResolveMessage
    | WebviewReaderDispatchMessage;

// ===== Extension Host → Webview =====

export interface HostLoadMessage {
    type: 'load';
    content: string;
    frontmatter?: string;
    filePath?: string;
    baseUri?: string;
}

export interface HostChunkMessage {
    type: 'chunk';
    id: string;
    text: string;
    replace?: boolean;
}

export interface HostDoneMessage {
    type: 'done';
    id: string;
    fullText: string;
}

export interface HostErrorMessage {
    type: 'error';
    id: string;
    message: string;
}

export interface HostSavedMessage {
    type: 'saved';
    success: boolean;
    filePath?: string;
}

export interface HostThemeMessage {
    type: 'theme';
    kind: 'light' | 'dark' | 'highContrast';
}

export interface HostFileUploadedMessage {
    type: 'file-uploaded';
    uploadId: string;
    webviewUri: string;
    relativePath: string;
    isImage: boolean;
    fileName: string;
}

export interface HostConflictMessage {
    type: 'conflict';
}

export type HostMessage =
    | HostLoadMessage
    | HostChunkMessage
    | HostDoneMessage
    | HostErrorMessage
    | HostSavedMessage
    | HostThemeMessage
    | HostFileUploadedMessage
    | HostConflictMessage;

// ===== Reader Webview ↔ Extension Host =====

// Webview → Host
export interface ReaderReadyMessage { type: 'reader-ready'; }
export interface ReaderRegenerateMessage {
    type: 'reader-regenerate';
    userPrompt?: string;   // if present, replaces the current prompt before regen
}
export interface ReaderExportMessage { type: 'reader-export'; }

export type ReaderWebviewMessage =
    | ReaderReadyMessage
    | ReaderRegenerateMessage
    | ReaderExportMessage;

// Host → Webview
export interface ReaderInitMessage {
    type: 'reader-init';
    sourceFileName: string;        // basename for the title bar
    preset: string;                // human-readable preset name (e.g. "Blog View")
    userPrompt: string;            // empty string if not provided
    baseUri: string;               // webview URI to source's directory (for image rewriting)
    estInputTokens: number;        // heuristic chars/4
    styleReferenceName?: string;   // basename of the loaded .bbreader.md, if any
}
export interface ReaderStartMessage { type: 'reader-start'; }
export interface ReaderChunkMessage { type: 'reader-chunk'; text: string; }
export interface ReaderDoneMessage {
    type: 'reader-done';
    fullHtml: string;
    tokensUsed: number;
    costUsd?: number;
    durationMs: number;
}
export interface ReaderErrorMessage { type: 'reader-error'; message: string; }
export interface ReaderSourceChangedMessage { type: 'reader-source-changed'; }
export interface ReaderSourceClosedMessage { type: 'reader-source-closed'; }
export interface ReaderExportResultMessage {
    type: 'reader-export-result';
    success: boolean;
    filePath?: string;
    error?: string;
}
export interface ReaderThemeMessage {
    type: 'reader-theme';
    kind: 'light' | 'dark' | 'highContrast';
}

export type ReaderHostMessage =
    | ReaderInitMessage
    | ReaderStartMessage
    | ReaderChunkMessage
    | ReaderDoneMessage
    | ReaderErrorMessage
    | ReaderSourceChangedMessage
    | ReaderSourceClosedMessage
    | ReaderExportResultMessage
    | ReaderThemeMessage;
