// src/utils/DocumentLock.ts
import * as vscode from 'vscode';

interface LockInfo {
    range: vscode.Range;
    message: string;
    displayText?: string;
}

/**
 * 统一的文档锁定管理器，提供完整的锁定、装饰和保护功能
 */
export class DocumentLockManager {
    private static instance: DocumentLockManager | undefined;
    private locks = new Map<string, Map<string, LockInfo>>();
    private selectionGuard: SelectionGuard | undefined;

    // 装饰类型：背景锁定装饰
    private static readonly LOCK_DECORATION_TYPE = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(169, 169, 169, 1)',
        border: '1px solid rgba(255, 217, 0, 1)',
        borderRadius: '3px',
    });

    // 装饰类型：文本提示装饰
    private static readonly TEXT_DECORATION_TYPE = vscode.window.createTextEditorDecorationType({
        after: {
            margin: '0 0 0 1em',
            color: 'rgba(255, 217, 0, 0.8)',
            fontStyle: 'italic',
            fontWeight: 'bold',
        },
    });

    private constructor() {
        this.selectionGuard = new SelectionGuard(this);
    }

    /**
     * 获取单例实例
     */
    static getInstance(): DocumentLockManager {
        if (!this.instance) {
            this.instance = new DocumentLockManager();
        }
        return this.instance;
    }

    /**
     * 锁定文档区域
     * @param editor 文本编辑器
     * @param range 锁定范围
     * @param message 锁定消息（状态栏显示）
     * @param displayText 在锁定区域显示的文本提示（可选）
     * @returns Disposable 对象，调用 dispose() 可自动解锁
     */
    lockRange(
        editor: vscode.TextEditor,
        range: vscode.Range,
        message: string = '正在处理文本，请勿编辑',
        displayText?: string
    ): vscode.Disposable {
        const documentUri = editor.document.uri.toString();
        const lockId = `lock_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        // 确保文档的锁定映射存在
        if (!this.locks.has(documentUri)) {
            this.locks.set(documentUri, new Map());
        }

        const docLocks = this.locks.get(documentUri)!;
        docLocks.set(lockId, { range, message, displayText });

        this.updateDecorations(editor);

        // 创建锁定时检查当前光标位置，如果在锁定区域内则移动
        this.selectionGuard!.adjustSelectionsForRange(editor, range);

        // 返回自动释放的 Disposable
        return new vscode.Disposable(() => {
            this.unlockRange(editor, lockId);
        });
    }

    /**
     * 手动解锁指定的锁定区域
     */
    private unlockRange(editor: vscode.TextEditor, lockId: string): void {
        const documentUri = editor.document.uri.toString();
        const docLocks = this.locks.get(documentUri);
        
        if (docLocks && docLocks.delete(lockId)) {
            if (docLocks.size === 0) {
                this.locks.delete(documentUri);
            }
            this.updateDecorations(editor);
            
            // 如果没有更多锁定，清除状态栏消息
            if (this.getTotalLocksCount() === 0) {
                vscode.window.setStatusBarMessage('');
            }
        }
    }

    /**
     * 获取文档的所有锁定区域
     */
    getLockedRanges(document: vscode.TextDocument): vscode.Range[] {
        const docLocks = this.locks.get(document.uri.toString());
        if (!docLocks) {
            return [];
        }
        
        return Array.from(docLocks.values()).map(lock => lock.range);
    }

    /**
     * 检查指定区域是否与锁定区域相交
     */
    isRangeLocked(document: vscode.TextDocument, range: vscode.Range): boolean {
        const lockedRanges = this.getLockedRanges(document);
        return lockedRanges.some(lockedRange => lockedRange.intersection(range) !== undefined);
    }

    /**
     * 获取与指定区域相交的锁定消息
     */
    getLockMessage(document: vscode.TextDocument, range: vscode.Range): string | undefined {
        const docLocks = this.locks.get(document.uri.toString());
        if (!docLocks) {
            return undefined;
        }

        for (const lock of docLocks.values()) {
            if (lock.range.intersection(range)) {
                return lock.message;
            }
        }
        return undefined;
    }

    /**
     * 清除文档的所有锁定
     */
    clearDocumentLocks(editor: vscode.TextEditor): void {
        const documentUri = editor.document.uri.toString();
        if (this.locks.delete(documentUri)) {
            this.updateDecorations(editor);
            if (this.getTotalLocksCount() === 0) {
                vscode.window.setStatusBarMessage('');
            }
        }
    }

    /**
     * 更新编辑器的装饰
     */
    private updateDecorations(editor: vscode.TextEditor): void {
        const documentUri = editor.document.uri.toString();
        const docLocks = this.locks.get(documentUri);

        if (!docLocks || docLocks.size === 0) {
            // 清除所有装饰
            editor.setDecorations(DocumentLockManager.LOCK_DECORATION_TYPE, []);
            editor.setDecorations(DocumentLockManager.TEXT_DECORATION_TYPE, []);
            return;
        }

        const lockDecorations: vscode.DecorationOptions[] = [];
        const textDecorations: vscode.DecorationOptions[] = [];

        docLocks.forEach(lock => {
            // 添加背景锁定装饰
            lockDecorations.push({
                range: lock.range,
                hoverMessage: new vscode.MarkdownString(lock.message)
            });

            // 如果有显示文本，添加文本装饰
            if (lock.displayText) {
                textDecorations.push({
                    range: new vscode.Range(lock.range.end, lock.range.end),
                    renderOptions: {
                        after: {
                            contentText: ` 🔒 ${lock.displayText}`,
                            color: 'rgba(255, 85, 0, 0.8)',
                            fontStyle: 'italic',
                            fontWeight: 'bold',
                        }
                    }
                });
            }
        });

        editor.setDecorations(DocumentLockManager.LOCK_DECORATION_TYPE, lockDecorations);
        editor.setDecorations(DocumentLockManager.TEXT_DECORATION_TYPE, textDecorations);
    }

    /**
     * 获取总锁定数量
     */
    private getTotalLocksCount(): number {
        let count = 0;
        this.locks.forEach(docLocks => {
            count += docLocks.size;
        });
        return count;
    }

    /**
     * 检查锁定区域是否在文件末尾
     */
    public isRangeAtEndOfFile(document: vscode.TextDocument, range: vscode.Range): boolean {
        const lastLine = document.lineCount - 1;
        const lastLineText = document.lineAt(lastLine).text;
        return range.end.line === lastLine && range.end.character === lastLineText.length;
    }

    /**
     * 销毁管理器
     */
    dispose(): void {
        if (this.selectionGuard) {
            this.selectionGuard.dispose();
            this.selectionGuard = undefined;
        }
        this.locks.clear();
        DocumentLockManager.instance = undefined;
    }
}

/**
 * 选择保护器，防止用户选择或编辑锁定区域
 */
class SelectionGuard implements vscode.Disposable {
    private subscription: vscode.Disposable;
    private adjusting = false;

    constructor(private lockManager: DocumentLockManager) {
        this.subscription = vscode.window.onDidChangeTextEditorSelection(e => {
            if (this.adjusting) {
                return;
            }
            
            const document = e.textEditor.document;
            const lockedRanges = this.lockManager.getLockedRanges(document);
            if (lockedRanges.length === 0) {
                return;
            }

            // 为每个锁定区域调整选择
            this.adjusting = true;
            let anyAdjustment = false;
            const initialSelections = e.textEditor.selections;
            
            for (const lockedRange of lockedRanges) {
                this.adjustSelectionsForRange(e.textEditor, lockedRange, true); // skipReveal = true
                if (e.textEditor.selections !== initialSelections) {
                    anyAdjustment = true;
                }
            }
            
            // 统一处理reveal，避免多次调用
            if (anyAdjustment && e.textEditor.selections.length > 0) {
                e.textEditor.revealRange(
                    new vscode.Range(e.textEditor.selections[0].active, e.textEditor.selections[0].active),
                    vscode.TextEditorRevealType.InCenterIfOutsideViewport
                );
            }
            
            this.adjusting = false;
        });
    }

    /**
     * 为特定锁定区域调整编辑器选择（公共方法，供DocumentLockManager调用）
     */
    public adjustSelectionsForRange(editor: vscode.TextEditor, lockedRange: vscode.Range, skipReveal: boolean = false): void {
        const currentSelections = editor.selections;
        let needsAdjustment = false;
        const adjustedSelections: vscode.Selection[] = [];
        
        for (const selection of currentSelections) {
            const selectionRange = new vscode.Range(selection.start, selection.end);
            
            // 检查选择是否与锁定区域相交或包含在内
            if (selectionRange.intersection(lockedRange) || 
                lockedRange.contains(selection.active) || 
                lockedRange.contains(selection.anchor)) {
                
                const adjustedSelection = this.moveSelectionOutside(selection, lockedRange);
                adjustedSelections.push(adjustedSelection);
                needsAdjustment = true;
            } else {
                adjustedSelections.push(selection);
            }
        }
        
        if (needsAdjustment) {
            editor.selections = adjustedSelections;
            if (!skipReveal) {
                editor.revealRange(
                    new vscode.Range(adjustedSelections[0].active, adjustedSelections[0].active),
                    vscode.TextEditorRevealType.InCenterIfOutsideViewport
                );
            }
        }
    }

    /**
     * 将选择移动到锁定区域外
     */
    public moveSelectionOutside(selection: vscode.Selection, lockedRange: vscode.Range): vscode.Selection {
        const activePosition = selection.active;
        const document = vscode.window.activeTextEditor?.document;
        if (!document) {
            return selection;
        }
        
        // 判断光标应该移动到锁定区域的哪一边
        const distanceToStart = Math.abs(activePosition.line - lockedRange.start.line) + 
                               Math.abs(activePosition.character - lockedRange.start.character);
        const distanceToEnd = Math.abs(activePosition.line - lockedRange.end.line) + 
                             Math.abs(activePosition.character - lockedRange.end.character);
        
        let targetPosition: vscode.Position;
        
        if (distanceToStart <= distanceToEnd) {
            // 移动到锁定区域开始位置
            targetPosition = lockedRange.start;
        } else {
            // 移动到锁定区域结束位置
            // BUG 1修复: 检查是否在文件末尾，如果是则移动到锁定区域开始位置
            if (this.lockManager.isRangeAtEndOfFile(document, lockedRange)) {
                // 如果锁定区域在文件末尾，移动到锁定区域开始位置避免复杂性
                targetPosition = lockedRange.start;
            } else {
                // 移动到锁定区域外的下一个位置
                if (lockedRange.end.character === 0) {
                    targetPosition = lockedRange.end;
                } else {
                    const nextLine = lockedRange.end.line + 1;
                    if (nextLine < document.lineCount) {
                        targetPosition = new vscode.Position(nextLine, 0);
                    } else {
                        targetPosition = lockedRange.start;
                    }
                }
            }
        }
        
        // 创建新的选择，光标和锚点都在目标位置（折叠选择）
        return new vscode.Selection(targetPosition, targetPosition);
    }

    dispose(): void {
        this.subscription.dispose();
    }
}

// 导出便捷函数
export function lockDocumentRange(
    editor: vscode.TextEditor,
    range: vscode.Range,
    message?: string,
    displayText?: string
): vscode.Disposable {
    return DocumentLockManager.getInstance().lockRange(editor, range, message, displayText);
}

export function clearDocumentLocks(editor: vscode.TextEditor): void {
    DocumentLockManager.getInstance().clearDocumentLocks(editor);
}

export function isRangeLocked(document: vscode.TextDocument, range: vscode.Range): boolean {
    return DocumentLockManager.getInstance().isRangeLocked(document, range);
}