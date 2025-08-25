import * as vscode from 'vscode';
import { TextUtils } from '../utils/helpers';
import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { BB, BBCmd, StreamingActOptions } from '../core/bb';
import { StreamingTextUtils } from '../utils/StreamingTextWriter';
import { ConfigService } from '../services/ConfigService';
import { lockDocumentRange } from '../utils/DocumentLock';

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
        try {
            const streamingOptions: StreamingActOptions = {
                onChunk: (chunk: string) => {
                    console.log('BB streaming chunk:', chunk);
                },
                onProgress: (current: number, total: number) => {
                    const percentage = Math.round((current / total) * 100);
                    vscode.window.setStatusBarMessage(`BB progress: ${percentage}% (${current}/${total} chars)`, 1000);
                },
                onComplete: (result) => {
                    console.log('BB processing completed, total length:', result.replaceText.length);
                    vscode.window.showInformationMessage('BB: Streaming completed!');
                },
                onError: (error: Error) => {
                    console.error('BB processing error:', error);
                    vscode.window.showErrorMessage(`BB processing failed: ${error.message}`);
                }
            };

            const streamGenerator = await BB.i().actStreaming({
                filePath: editor.document.uri.fsPath,
                selectText: text,
                cmd: cmd,
                msg: message
            }, streamingOptions);

            // Use StreamingTextUtils for streaming output and locking
            await StreamingTextUtils.streamChunksToRange(
                editor,
                range,
                this.convertToStreamChunks(streamGenerator),
                {
                    chunkDelay: 30,
                    showCursor: true,
                    cursorChar: '<BB',
                    lockRange: true,
                    lockMessage: `BB is executing ${cmd} command...`,
                    onProgress: (written: number, total: number) => {
                        console.log(`Streaming progress: ${written}/${total} chars`);
                    },
                    onComplete: () => {
                        console.log('Streaming output completed');
                    },
                    onError: (error: Error) => {
                        console.error('Streaming output error:', error);
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
        const sb = vscode.window.setStatusBarMessage('BB is working');
        
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
            
            vscode.window.showInformationMessage('BB: DONNNNNNNE!');
            
        } catch (e: unknown) {
            if (e instanceof Error) {
                vscode.window.showErrorMessage(`BB processing failed: ${e.message}`);
            }
        } finally {
            lock.dispose();
            sb.dispose();
        }
    }

    /**
     * Convert stream generator to StreamChunk format
     */
    private async *convertToStreamChunks(
        generator: AsyncGenerator<string, any, unknown>
    ): AsyncGenerator<{text: string}, void, unknown> {
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


