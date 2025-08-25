import * as vscode from 'vscode';
import { TextUtils } from '../utils/helpers';
import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { BB, BBCmd } from '../core/bb';
import { StreamingTextUtils } from '../utils/StreamingTextWriter';
import { ConfigService } from '../services/ConfigService';
import { lockDocumentRange } from '../utils/DocumentLock';
import { StatusBarAnimation } from '../utils/StatusBarAnimation';

export function registerBBCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'blogbuddy.bb',
        () => new BBCommand().hiBB()
    ));
}

class BBCommand {
    async hiBB(): Promise<void> {
        const result = TextUtils.getSelectedTextOrParagraph();
        const editor = vscode.window.activeTextEditor;
        if (!result) {
            return;
        }
        if (!editor) {
            return;
        }
        const text = result.text;
        const ps = findAndParse(text);
        if (!ps) {
            return;
        }
        const cmd = Object.values(BBCmd).find(status => ps.command === status);
        if (!cmd) {
            throw new AppError(
                ErrorCode.UNKNOWN_CMD,
                "BB don't know cmd: " + ps.command,
                "BB don't know cmd: " + ps.command,
            );
        }
        const rp_text = text.slice(0, ps.startIndex) + text.slice(ps.endIndex);

        // Check configuration to decide between streaming or non-streaming mode
        const config = ConfigService.getInstance().getAllConfig();
        const useStreaming = config.streaming;
        if (useStreaming) {
            // Streaming processing mode
            await this.handleStreamingMode(editor, result.range, rp_text, cmd, ps.message);
        } else {
            // Traditional non-streaming processing mode
            await this.handleNonStreamingMode(editor, result.range, rp_text, cmd, ps.message);
        }
    }

    /**
     * Handle streaming mode
     */
    private async handleStreamingMode(
        editor: vscode.TextEditor,
        range: vscode.Range,
        text: string,
        cmd: BBCmd,
        message: string
    ): Promise<void> {
        const animation = StatusBarAnimation.getInstance();

        try {
            // Start with streaming animation
            animation.showStatic(`$(loading~spin) BB streaming ${cmd}`);

            const streamGenerator = await BB.i().actStreaming({
                filePath: editor.document.uri.fsPath,
                selectText: text,
                cmd: cmd,
                msg: message
            });

            // Use StreamingTextUtils for streaming output and locking
            await StreamingTextUtils.streamChunksToRange(
                editor,
                range,
                this.convertToStreamChunks(streamGenerator),
                {
                    chunkDelay: 1,
                    showCursor: true,
                    cursorChar: '<BB',
                    lockRange: true,
                    lockMessage: `BB is executing ${cmd} command...`,
                    onProgress: (written: number, total?: number) => {
                        animation.showStatic(`$(loading~spin) BB progress: ${written} chars generated`);
                        console.log(`Streaming progress: ${written} chars written`);
                    },
                    onComplete: (result: string) => {
                        console.log('BB processing completed, total length:', result.length);
                        animation.showStatic('BB: Streaming completed!', 3000);
                    },
                    onError: (error: Error) => {
                        console.error('Streaming output error:', error);
                        animation.showStatic(`BB failed: ${error.message}`, 5000);
                        vscode.window.showErrorMessage(`BB processing failed: ${error.message}`);
                    }
                }
            );
        } catch (e: unknown) {
            if (e instanceof Error) {
                vscode.window.showErrorMessage(`BB streaming failed: ${e.message}`);
            }
        }
    }

    /**
     * Handle non-streaming mode (traditional mode)
     */
    private async handleNonStreamingMode(
        editor: vscode.TextEditor,
        range: vscode.Range,
        text: string,
        cmd: BBCmd,
        message: string
    ): Promise<void> {
        const lock = lockDocumentRange(editor, range, 'BB is working on this...');
        const animation = StatusBarAnimation.getInstance();

        // Start animation with command-specific message
        animation.showStatic(`$(loading~spin) BB executing ${cmd}`);

        try {
            const response = await BB.i().act({
                filePath: editor.document.uri.fsPath,
                selectText: text,
                cmd: cmd,
                msg: message
            });

            if (editor && response.replaceText.length > 0) {
                await editor.edit(
                    editBuilder => editBuilder.replace(range, response.replaceText)
                );
            }
            // Show completion message
            animation.showStatic('BB: Completed!', 3000);
        } catch (e: unknown) {
            if (e instanceof Error) {
                animation.showStatic(`BB failed: ${e.message}`, 5000);
                vscode.window.showErrorMessage(`BB processing failed: ${e.message}`);
            }
        } finally {
            lock.dispose();
        }
    }

    /**
     * Convert stream generator to StreamChunk format
     */
    private async *convertToStreamChunks(
        generator: AsyncGenerator<string, any, unknown>
    ): AsyncGenerator<{ text: string }, void, unknown> {
        for await (const chunk of generator) {
            yield { text: chunk };
        }
    }
}

interface ParseResult {
    command: string;
    message: string;
    fullMatch: string;      // Complete matched string
    startIndex: number;     // Start position in original string
    endIndex: number;       // End position in original string
}

function findAndParse(text: string): ParseResult | null {
    // Find and match the first command string like <bbcmd:content>
    const regex = /<([\w-]+)(?::([^>]*))?>/;
    const match = text.match(regex);

    if (match) {
        const fullMatch = match[0];
        const command = match[1];
        const message = match[2] || '';
        const startIndex = match.index!;
        const endIndex = startIndex + fullMatch.length;

        return {
            command,
            message,
            fullMatch,
            startIndex,
            endIndex
        };
    }

    return null;
}


