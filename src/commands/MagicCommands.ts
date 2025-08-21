import * as vscode from 'vscode';
import { TextUtils } from '../utils/helpers';
import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { BBCmd } from '../core/constants';
import { BB } from '../core/bgent';
import { lockDocumentRange } from '../utils/DocumentLock';

export function registerMagicCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'blogbuddy.magic',
        () => new MagicCommand().hiBB()
    ));
}

class MagicCommand {
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
        const cmd = Object.values(BBCmd).find(status => ps.command.includes(status));
        if (!cmd) {
            throw new AppError(
                ErrorCode.UNKNOWN_CMD,
                "BB don't know cmd: " + ps.command,
                "BB don't know cmd: " + ps.command,
            );
        }
        const rp_text = text.slice(0, ps.startIndex) + text.slice(ps.endIndex);
        const lock = lockDocumentRange(editor, result.range, 'BB is working on this...');
        try {
            const response = await BB.i().act({
                filePath: '',
                selectText: rp_text,
                cmd: cmd,
                msg: ps.message
            });
            if (editor && response.replaceText.length > 0) {
                await editor.edit(
                    editBuilder => editBuilder.replace(result.range, response.replaceText)
                );
            }
            vscode.window.showInformationMessage('BB: DONNNNNNNE!');
        }
        catch (e: unknown) {
            if (e instanceof Error) {
                vscode.window.showErrorMessage(e.message);
            }
        }
        finally {
            lock.dispose();

        }
    }
}

interface ParseResult {
    command: string;
    message: string;
    fullMatch: string;      // 完整匹配的字符串
    startIndex: number;     // 在原字符串中的开始位置
    endIndex: number;       // 在原字符串中的结束位置
}

function findAndParse(text: string): ParseResult | null {
    // 查找、匹配第一个类似 <bbcmd:content> 的指令字符串
    const regex = /<(\w+)(?::([^>]*))?>/;
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


