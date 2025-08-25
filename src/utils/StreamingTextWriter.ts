import * as vscode from 'vscode';
import { DocumentLockManager } from './DocumentLock';

export interface StreamingOptions {
    chunkDelay?: number;
    showCursor?: boolean;
    cursorChar?: string;
    lockRange?: boolean;
    lockMessage?: string;
    onProgress?: (writtenChars: number, totalChars?: number) => void;
    onComplete?: (result: string) => void;
    onError?: (error: Error) => void;
}

export interface StreamChunk {
    text: string;
    replace?: boolean;
}

export class StreamingTextWriter {
    private editor: vscode.TextEditor;
    private range: vscode.Range;
    private options: Required<StreamingOptions>;
    private buffer: string = '';
    private isWriting: boolean = false;
    private totalChars: number = 0;
    private writtenChars: number = 0;
    private lockDisposable?: vscode.Disposable;
    private cursorDecoration?: vscode.TextEditorDecorationType;
    private writeTimeout?: NodeJS.Timeout;

    constructor(editor: vscode.TextEditor, range: vscode.Range, options: StreamingOptions = {}) {
        this.editor = editor;
        this.range = range;
        this.options = {
            chunkDelay: options.chunkDelay ?? 50,
            showCursor: options.showCursor ?? true,
            cursorChar: options.cursorChar ?? '▊',
            lockRange: options.lockRange ?? true,
            lockMessage: options.lockMessage ?? 'Streaming ...',
            onProgress: options.onProgress ?? (() => {}),
            onComplete: options.onComplete ?? (() => {}),
            onError: options.onError ?? (() => {}),
        };

        if (this.options.showCursor) {
            this.setupCursorDecoration();
        }
    }

    async writeStream(chunks: AsyncIterable<StreamChunk>): Promise<void> {
        if (this.isWriting) {
            throw new Error('StreamingTextWriter is already writing');
        }

        try {
            this.isWriting = true;
            this.buffer = '';
            this.writtenChars = 0;

            if (this.options.lockRange) {
                this.lockDisposable = DocumentLockManager.getInstance().lockRange(
                    this.editor,
                    this.range,
                    this.options.lockMessage
                );
            }

            for await (const chunk of chunks) {
                await this.processChunk(chunk);
            }

            await this.finalize();
        } catch (error) {
            this.handleError(error as Error);
        }
    }

    async writeString(text: string, options: { chunkSize?: number } = {}): Promise<void> {
        const chunkSize = options.chunkSize ?? 10;
        const chunks = this.createStringChunks(text, chunkSize);
        await this.writeStream(chunks);
    }

    /**
     * Write streaming content without knowing total length in advance
     */
    async writeStreamingChunks(chunks: AsyncIterable<string>): Promise<void> {
        const streamChunks = this.convertStringChunksToStreamChunks(chunks);
        await this.writeStream(streamChunks);
    }

    private async *convertStringChunksToStreamChunks(chunks: AsyncIterable<string>): AsyncGenerator<StreamChunk> {
        for await (const chunk of chunks) {
            yield { text: chunk };
        }
    }

    private async *createStringChunks(text: string, chunkSize: number): AsyncGenerator<StreamChunk> {
        for (let i = 0; i < text.length; i += chunkSize) {
            yield { text: text.slice(i, i + chunkSize) };
        }
    }

    private async processChunk(chunk: StreamChunk): Promise<void> {
        if (chunk.replace) {
            this.buffer = chunk.text;
            this.totalChars = chunk.text.length;
        } else {
            this.buffer += chunk.text;
            this.totalChars += chunk.text.length;
        }

        await this.renderBuffer();
    }

    private async renderBuffer(): Promise<void> {
        if (!this.buffer) {
            return;
        }

        const textToWrite = this.buffer.slice(0, this.writtenChars + 1);
        const displayText = this.options.showCursor 
            ? textToWrite + this.options.cursorChar 
            : textToWrite;

        await this.updateEditorText(displayText);
        this.writtenChars = textToWrite.length;

        // Support progress reporting with or without total
        const totalToReport = this.totalChars > 0 ? this.totalChars : undefined;
        this.options.onProgress(this.writtenChars, totalToReport);

        if (this.writtenChars < this.buffer.length) {
            await this.scheduleNextRender();
        }
    }

    private async scheduleNextRender(): Promise<void> {
        return new Promise((resolve) => {
            this.writeTimeout = setTimeout(async () => {
                await this.renderBuffer();
                resolve();
            }, this.options.chunkDelay);
        });
    }

    private async updateEditorText(text: string): Promise<void> {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(this.editor.document.uri, this.range, text);
        
        await vscode.workspace.applyEdit(edit);
        
        this.updateRange(text);
        this.updateCursorPosition();
    }

    private updateRange(text: string): void {
        const lines = text.split('\n');
        const endLine = this.range.start.line + lines.length - 1;
        const endChar = lines.length === 1 
            ? this.range.start.character + text.length
            : lines[lines.length - 1].length;
        
        this.range = new vscode.Range(
            this.range.start,
            new vscode.Position(endLine, endChar)
        );
    }

    private updateCursorPosition(): void {
        if (!this.options.showCursor || !this.cursorDecoration) {
            return;
        }

        const cursorPosition = this.range.end;
        const cursorRange = new vscode.Range(cursorPosition, cursorPosition);
        
        this.editor.setDecorations(this.cursorDecoration, [{ range: cursorRange }]);
    }

    private setupCursorDecoration(): void {
        this.cursorDecoration = vscode.window.createTextEditorDecorationType({
            after: {
                contentText: this.options.cursorChar,
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 'bold'
            }
        });
    }

    private async finalize(): Promise<void> {
        if (this.writeTimeout) {
            clearTimeout(this.writeTimeout);
        }

        if (this.options.showCursor && this.cursorDecoration) {
            this.editor.setDecorations(this.cursorDecoration, []);
        }

        const finalText = this.buffer;
        await this.updateEditorText(finalText);

        this.cleanup();
        this.options.onComplete(finalText);
    }

    private handleError(error: Error): void {
        this.cleanup();
        this.options.onError(error);
    }

    private cleanup(): void {
        this.isWriting = false;
        
        if (this.writeTimeout) {
            clearTimeout(this.writeTimeout);
            this.writeTimeout = undefined;
        }

        if (this.lockDisposable) {
            this.lockDisposable.dispose();
            this.lockDisposable = undefined;
        }

        if (this.cursorDecoration) {
            this.editor.setDecorations(this.cursorDecoration, []);
            this.cursorDecoration.dispose();
            this.cursorDecoration = undefined;
        }
    }

    stop(): void {
        if (!this.isWriting) {
            return;
        }
        
        if (this.writeTimeout) {
            clearTimeout(this.writeTimeout);
        }
        
        this.finalize();
    }

    isActive(): boolean {
        return this.isWriting;
    }

    getProgress(): { written: number; total: number } {
        return { written: this.writtenChars, total: this.totalChars };
    }

    dispose(): void {
        this.cleanup();
    }
}

export class StreamingTextUtils {
    static async streamToRange(
        editor: vscode.TextEditor,
        range: vscode.Range,
        text: string,
        options: StreamingOptions = {}
    ): Promise<void> {
        const writer = new StreamingTextWriter(editor, range, options);
        await writer.writeString(text);
        writer.dispose();
    }

    static async streamChunksToRange(
        editor: vscode.TextEditor,
        range: vscode.Range,
        chunks: AsyncIterable<StreamChunk>,
        options: StreamingOptions = {}
    ): Promise<void> {
        const writer = new StreamingTextWriter(editor, range, options);
        await writer.writeStream(chunks);
        writer.dispose();
    }

    /**
     * Stream raw string chunks without known total length
     */
    static async streamStringChunksToRange(
        editor: vscode.TextEditor,
        range: vscode.Range,
        chunks: AsyncIterable<string>,
        options: StreamingOptions = {}
    ): Promise<void> {
        const writer = new StreamingTextWriter(editor, range, options);
        await writer.writeStreamingChunks(chunks);
        writer.dispose();
    }

    static createWriter(
        editor: vscode.TextEditor,
        range: vscode.Range,
        options: StreamingOptions = {}
    ): StreamingTextWriter {
        return new StreamingTextWriter(editor, range, options);
    }
}