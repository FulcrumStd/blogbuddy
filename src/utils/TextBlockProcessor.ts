import * as vscode from 'vscode';

/**
 * 文本块数据接口
 */
export interface TextBlockChunk {
    /** 文本内容 */
    text: string;
    /** 是否替换整个内容（而不是追加） */
    replace?: boolean;
}

/**
 * 文本块处理器 - 锁定指定范围并支持流式/一次性文本输出
 * 
 * 核心功能：
 * 1. 锁定指定的文本范围，阻止用户编辑（通过光标控制）
 * 2. 提供清晰的视觉反馈（背景高亮）
 * 3. 智能追踪锁定区域位置（即使文档其他部分被编辑）
 * 4. 支持流式和一次性文本输出
 */
export class TextBlockProcessor implements vscode.Disposable {
    private readonly editor: vscode.TextEditor;
    private readonly document: vscode.TextDocument;
    
    // 锁定区域追踪
    private lockedRange: vscode.Range;
    
    // 状态管理
    private isLocked: boolean = true;
    private isActive: boolean = true;
    private isUpdating: boolean = false;  // 标记程序正在更新
    
    // 视觉反馈
    private readonly lockedDecoration: vscode.TextEditorDecorationType;
    private readonly processingDecoration: vscode.TextEditorDecorationType;
    
    // 事件监听器
    private readonly disposables: vscode.Disposable[] = [];
    
    constructor(
        editor: vscode.TextEditor,
        range: vscode.Range,
        private readonly displayPrefix: string = '🔒'
    ) {
        this.editor = editor;
        this.document = editor.document;
        this.lockedRange = range;
        
        // 创建视觉装饰
        this.lockedDecoration = vscode.window.createTextEditorDecorationType({
            borderColor: '#FFD900',
            borderStyle: 'dashed',
            borderWidth: '1px',
            isWholeLine: true
        });
        
        this.processingDecoration = vscode.window.createTextEditorDecorationType({
            before: {
                contentText: displayPrefix,
                color: '#FFD900',
                margin: '0 4px 0 0'
            }
        });
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 初始化锁定
        this.initializeLock();
    }
    
    /**
     * 初始化锁定区域
     */
    private initializeLock(): void {
        // 应用视觉装饰
        this.applyDecorations();
        
        // 确保光标不在锁定区域内
        this.ensureCursorOutside();
    }
    
    /**
     * 设置事件监听器
     */
    private setupEventListeners(): void {
        // 监听文档变化（用于更新位置）
        const changeListener = vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document !== this.document || !this.isActive || this.isUpdating) {
                return;
            }
            
            // 更新锁定范围位置
            this.updateLockedRange(event);
        });
        
        // 监听选择变化（防止光标进入）
        const selectionListener = vscode.window.onDidChangeTextEditorSelection(event => {
            if (event.textEditor !== this.editor || !this.isActive || !this.isLocked) {
                return;
            }
            
            this.handleSelectionChange(event);
        });
        
        this.disposables.push(changeListener, selectionListener);
    }
    
    /**
     * 更新锁定范围的位置（基于文档变化）
     */
    private updateLockedRange(event: vscode.TextDocumentChangeEvent): void {
        let startLine = this.lockedRange.start.line;
        let startChar = this.lockedRange.start.character;
        let endLine = this.lockedRange.end.line;
        let endChar = this.lockedRange.end.character;
        
        for (const change of event.contentChanges) {
            const changeStart = change.range.start;
            const changeEnd = change.range.end;
            
            // 只处理锁定范围之前的变化
            if (changeEnd.isBefore(this.lockedRange.start) || changeEnd.isEqual(this.lockedRange.start)) {
                const linesAdded = change.text.split('\n').length - 1;
                const linesRemoved = changeEnd.line - changeStart.line;
                const netLineChange = linesAdded - linesRemoved;
                
                // 更新行号
                if (netLineChange !== 0) {
                    startLine += netLineChange;
                    endLine += netLineChange;
                }
                
                // 如果在同一行，更新字符偏移
                if (changeEnd.line === startLine && netLineChange === 0) {
                    const charDiff = change.text.length - (changeEnd.character - changeStart.character);
                    if (charDiff !== 0) {
                        startChar += charDiff;
                        endChar += charDiff;
                    }
                }
            }
        }
        
        // 更新范围
        this.lockedRange = new vscode.Range(
            new vscode.Position(startLine, startChar),
            new vscode.Position(endLine, endChar)
        );
        
        // 重新应用装饰
        this.applyDecorations();
    }
    
    /**
     * 处理选择变化 - 阻止光标进入锁定区域
     */
    private handleSelectionChange(event: vscode.TextEditorSelectionChangeEvent): void {
        for (const selection of event.selections) {
            // 检查光标或选择是否在锁定区域内
            if (this.lockedRange.contains(selection.active) || 
                (!selection.isEmpty && !selection.intersection(this.lockedRange)?.isEmpty)) {
                
                // 移出光标并显示提示
                this.repositionCursor();
                vscode.window.setStatusBarMessage(
                    `${this.displayPrefix} This area is locked during processing`,
                    2000
                );
                break;
            }
        }
    }
    
    /**
     * 将光标移到锁定区域外
     */
    private repositionCursor(): void {
        let newPosition: vscode.Position;
        
        // 优先移到锁定区域前面
        if (this.lockedRange.start.line > 0) {
            const previousLine = this.lockedRange.start.line - 1;
            newPosition = new vscode.Position(
                previousLine,
                this.document.lineAt(previousLine).text.length
            );
        } else {
            // 如果在文档开头，移到锁定区域后面
            const afterLine = this.lockedRange.end.line + 1;
            if (afterLine < this.document.lineCount) {
                newPosition = new vscode.Position(afterLine, 0);
            } else {
                // 如果没有后面的行，停在文档末尾
                const lastLine = this.document.lineCount - 1;
                newPosition = new vscode.Position(
                    lastLine,
                    this.document.lineAt(lastLine).text.length
                );
            }
        }
        
        this.editor.selection = new vscode.Selection(newPosition, newPosition);
        this.editor.revealRange(
            new vscode.Range(newPosition, newPosition),
            vscode.TextEditorRevealType.InCenterIfOutsideViewport
        );
    }
    
    /**
     * 确保光标在锁定区域外
     */
    private ensureCursorOutside(): void {
        const cursor = this.editor.selection.active;
        if (this.lockedRange.contains(cursor)) {
            this.repositionCursor();
        }
    }
    
    /**
     * 应用视觉装饰
     */
    private applyDecorations(): void {
        if (!this.isActive || !this.isLocked) {
            return;
        }
        
        // 应用锁定区域背景装饰
        this.editor.setDecorations(this.lockedDecoration, [this.lockedRange]);
        
        // 在第一行添加处理标记
        const firstLineRange = new vscode.Range(
            this.lockedRange.start,
            this.lockedRange.start
        );
        this.editor.setDecorations(this.processingDecoration, [firstLineRange]);
    }
    
    /**
     * 清除所有装饰
     */
    private clearDecorations(): void {
        this.editor.setDecorations(this.lockedDecoration, []);
        this.editor.setDecorations(this.processingDecoration, []);
    }
    
    /**
     * 更新锁定范围（写入内容后）
     */
    private updateRangeAfterWrite(text: string): void {
        const lines = text.split('\n');
        const lastLineLength = lines[lines.length - 1].length;
        
        let newEnd: vscode.Position;
        if (lines.length === 1) {
            newEnd = new vscode.Position(
                this.lockedRange.start.line,
                this.lockedRange.start.character + lastLineLength
            );
        } else {
            newEnd = new vscode.Position(
                this.lockedRange.start.line + lines.length - 1,
                lastLineLength
            );
        }
        
        this.lockedRange = new vscode.Range(this.lockedRange.start, newEnd);
    }
    
    /**
     * 一次性写入文本
     */
    async writeText(text: string): Promise<void> {
        if (!this.isActive) {
            return;
        }
        
        // 设置更新标志，防止触发位置追踪
        this.isUpdating = true;
        try {
            const edit = new vscode.WorkspaceEdit();
            edit.replace(this.document.uri, this.lockedRange, text);
            await vscode.workspace.applyEdit(edit);
        } finally {
            this.isUpdating = false;
        }
        
        // 更新锁定范围
        this.updateRangeAfterWrite(text);
        
        // 确保光标不在锁定区域内
        this.ensureCursorOutside();
    }
    
    /**
     * 流式写入文本
     */
    async writeStream(
        generator: AsyncIterable<TextBlockChunk>,
        options: { delay?: number } = {}
    ): Promise<void> {
        if (!this.isActive) {
            return;
        }
        
        const delay = options.delay || 0;
        let accumulatedText = '';
        let isFirstWrite = true;
        
        for await (const chunk of generator) {
            if (!this.isActive) {
                break;
            }
            
            // 处理文本块
            if (chunk.replace) {
                accumulatedText = chunk.text;
            } else {
                accumulatedText += chunk.text;
            }
            
            // 设置更新标志
            this.isUpdating = true;
            try {
                const edit = new vscode.WorkspaceEdit();
                edit.replace(this.document.uri, this.lockedRange, accumulatedText);
                await vscode.workspace.applyEdit(edit);
            } finally {
                this.isUpdating = false;
            }
            
            // 第一次写入后，确保光标在外
            if (isFirstWrite) {
                isFirstWrite = false;
                this.ensureCursorOutside();
            }
            
            // 更新锁定范围
            this.updateRangeAfterWrite(accumulatedText);
            
            // 重新应用装饰
            this.applyDecorations();
            
            // 延迟
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    /**
     * 解锁区域
     */
    unlock(): void {
        this.isLocked = false;
        this.clearDecorations();
    }
    
    /**
     * 获取锁定范围
     */
    getLockedRange(): vscode.Range {
        return this.lockedRange;
    }
    
    /**
     * 检查是否处于活动状态
     */
    isActiveState(): boolean {
        return this.isActive;
    }
    
    /**
     * 释放资源
     */
    dispose(): vscode.Position {
        // 解锁
        this.unlock();
        
        // 清理装饰
        this.lockedDecoration.dispose();
        this.processingDecoration.dispose();
        
        // 清理事件监听
        this.disposables.forEach(d => d.dispose());
        
        // 标记为非活动
        this.isActive = false;
        
        // 返回最终位置
        return this.lockedRange.end;
    }
}