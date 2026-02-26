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
    | WebviewFrontmatterUpdateMessage;

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

export type HostMessage =
    | HostLoadMessage
    | HostChunkMessage
    | HostDoneMessage
    | HostErrorMessage
    | HostSavedMessage
    | HostThemeMessage
    | HostFileUploadedMessage;
