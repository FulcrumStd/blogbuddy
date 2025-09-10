// src/utils/CursorDecorator.ts
import * as vscode from 'vscode';
import { Colors } from './GlobalColors';

/**
 * 光标装饰器配置接口
 */
export interface DecoratorConfig {
    /** 装饰文字内容 */
    text: string;
    /** 装饰文字颜色 */
    color?: string;
    /** 装饰文字背景色 */
    backgroundColor?: string;
    /** 装饰文字字体大小 */
    fontSize?: string;
    /** 装饰文字透明度 */
    opacity?: number;
    /** 水平偏移量（像素） */
    offsetX?: number;
    /** 垂直偏移量（像素） */
    offsetY?: number;
    /** 是否启用动画效果 */
    animated?: boolean;
}

/**
 * 光标装饰器类 - 在用户光标后添加装饰性文字，随光标移动
 */
export class CursorDecorator {
    private decorationType: vscode.TextEditorDecorationType | null = null;
    private lastCursorPosition: vscode.Position | null = null;
    private disposables: vscode.Disposable[] = [];
    private config: DecoratorConfig;
    private isActive: boolean = false;

    constructor(config: DecoratorConfig) {
        this.config = {
            color: Colors.decoratorText,
            backgroundColor: Colors.decoratorBackground,
            fontSize: '12px',
            opacity: 0.7,
            offsetX: 10,
            offsetY: 0,
            animated: true,
            ...config
        };
    }

    /**
     * 启动装饰器
     */
    public start(): void {
        if (this.isActive) {
            return;
        }

        this.isActive = true;
        this.createDecorationType();
        this.setupEventListeners();
        this.updateDecoration();
    }

    /**
     * 停止装饰器
     */
    public stop(): void {
        if (!this.isActive) {
            return;
        }

        this.isActive = false;
        this.clearDecorations();
        this.dispose();
    }

    /**
     * 更新配置
     */
    public updateConfig(config: Partial<DecoratorConfig>): void {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...config };
        
        if (this.isActive) {
            // 检查是否需要重新创建装饰类型（只有样式属性变化时才需要）
            const needsRecreate = this.needsDecoratorRecreation(oldConfig, this.config);
            
            if (needsRecreate) {
                this.createDecorationType();
            }
            
            this.updateDecoration();
        }
    }

    /**
     * 检查是否需要重新创建装饰器
     */
    private needsDecoratorRecreation(oldConfig: DecoratorConfig, newConfig: DecoratorConfig): boolean {
        // 任何配置变化都需要重新创建装饰类型，包括文字内容
        return (
            oldConfig.text !== newConfig.text ||
            oldConfig.color !== newConfig.color ||
            oldConfig.backgroundColor !== newConfig.backgroundColor ||
            oldConfig.fontSize !== newConfig.fontSize ||
            oldConfig.opacity !== newConfig.opacity ||
            oldConfig.offsetX !== newConfig.offsetX ||
            oldConfig.offsetY !== newConfig.offsetY ||
            oldConfig.animated !== newConfig.animated
        );
    }

    /**
     * 获取当前配置
     */
    public getConfig(): DecoratorConfig {
        return { ...this.config };
    }

    /**
     * 创建装饰类型
     */
    private createDecorationType(): void {
        // 先创建新的装饰类型
        const newDecorationType = vscode.window.createTextEditorDecorationType({
            after: {
                contentText: this.config.text,
                color: this.config.color,
                backgroundColor: this.config.backgroundColor,
                margin: `0 0 0 ${this.config.offsetX}px`,
                textDecoration: 'none',
                fontWeight: 'normal',
                fontStyle: 'normal'
            },
            isWholeLine: true,  // 设置为整行装饰以确保稳定性
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
        });

        // 清理旧的装饰类型（在新类型创建之后）
        if (this.decorationType) {
            this.decorationType.dispose();
        }

        // 设置新的装饰类型
        this.decorationType = newDecorationType;
    }


    /**
     * 设置事件监听器
     */
    private setupEventListeners(): void {
        // 监听光标位置变化
        const cursorChangeDisposable = vscode.window.onDidChangeTextEditorSelection(
            this.onCursorPositionChanged.bind(this)
        );
        this.disposables.push(cursorChangeDisposable);

        // 监听活动编辑器变化
        const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(
            this.onActiveEditorChanged.bind(this)
        );
        this.disposables.push(editorChangeDisposable);

        // 监听文档变化
        const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
            this.onDocumentChanged.bind(this)
        );
        this.disposables.push(documentChangeDisposable);
    }

    /**
     * 光标位置变化事件处理
     */
    private onCursorPositionChanged(event: vscode.TextEditorSelectionChangeEvent): void {
        if (!this.isActive || !event.textEditor) {
            return;
        }

        // 使用防抖来避免过于频繁的更新
        this.debounceUpdateDecoration();
    }

    /**
     * 活动编辑器变化事件处理
     */
    private onActiveEditorChanged(editor: vscode.TextEditor | undefined): void {
        if (!this.isActive) {
            return;
        }

        this.clearDecorations();
        if (editor) {
            this.updateDecoration();
        }
    }

    /**
     * 文档变化事件处理
     */
    private onDocumentChanged(_event: vscode.TextDocumentChangeEvent): void {
        if (!this.isActive) {
            return;
        }

        // 如果文档发生变化，延迟更新装饰以避免位置错误
        setTimeout(() => {
            this.updateDecoration();
        }, 100);
    }

    /**
     * 防抖更新装饰
     */
    private debounceUpdateDecoration = this.debounce(() => {
        this.updateDecoration();
    }, 150);

    /**
     * 更新装饰
     */
    private updateDecoration(): void {
        if (!this.isActive || !this.decorationType) {
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        // 获取当前光标位置
        const selection = editor.selection;
        const cursorPosition = selection.active;

        // 检查光标位置是否发生变化
        if (this.lastCursorPosition && 
            this.lastCursorPosition.line === cursorPosition.line && 
            this.lastCursorPosition.character === cursorPosition.character) {
            return;
        }

        this.lastCursorPosition = cursorPosition;

        // 创建装饰范围 - 装饰光标所在的整行
        const range = new vscode.Range(
            new vscode.Position(cursorPosition.line, 0),
            new vscode.Position(cursorPosition.line, editor.document.lineAt(cursorPosition.line).text.length)
        );

        // 直接设置新装饰，VS Code会自动替换旧装饰，避免闪烁
        editor.setDecorations(this.decorationType, [range]);
    }

    /**
     * 清理所有装饰
     */
    private clearDecorations(): void {
        if (!this.decorationType) {
            return;
        }

        // 清理所有打开编辑器的装饰
        vscode.window.visibleTextEditors.forEach(editor => {
            editor.setDecorations(this.decorationType!, []);
        });
    }

    /**
     * 防抖函数
     */
    private debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * 释放资源
     */
    private dispose(): void {
        // 清理事件监听器
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];

        // 清理装饰类型
        if (this.decorationType) {
            this.decorationType.dispose();
            this.decorationType = null;
        }

        this.lastCursorPosition = null;
    }

    /**
     * 获取装饰器状态
     */
    public isRunning(): boolean {
        return this.isActive;
    }
}

/**
 * 全局光标装饰器实例管理器
 */
export class CursorDecoratorManager {
    private static instance: CursorDecoratorManager | null = null;
    private decorators: Map<string, CursorDecorator> = new Map();

    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): CursorDecoratorManager {
        if (!CursorDecoratorManager.instance) {
            CursorDecoratorManager.instance = new CursorDecoratorManager();
        }
        return CursorDecoratorManager.instance;
    }

    /**
     * 创建并启动装饰器
     */
    public createDecorator(id: string, config: DecoratorConfig): CursorDecorator {
        // 如果已存在同ID的装饰器，先停止它
        if (this.decorators.has(id)) {
            this.stopDecorator(id);
        }

        const decorator = new CursorDecorator(config);
        this.decorators.set(id, decorator);
        decorator.start();
        
        return decorator;
    }

    /**
     * 获取装饰器
     */
    public getDecorator(id: string): CursorDecorator | undefined {
        return this.decorators.get(id);
    }

    /**
     * 停止装饰器
     */
    public stopDecorator(id: string): boolean {
        const decorator = this.decorators.get(id);
        if (decorator) {
            decorator.stop();
            this.decorators.delete(id);
            return true;
        }
        return false;
    }

    /**
     * 停止所有装饰器
     */
    public stopAllDecorators(): void {
        this.decorators.forEach((decorator) => {
            decorator.stop();
        });
        this.decorators.clear();
    }

    /**
     * 获取所有装饰器ID
     */
    public getAllDecoratorIds(): string[] {
        return Array.from(this.decorators.keys());
    }

    /**
     * 获取活动装饰器数量
     */
    public getActiveCount(): number {
        return Array.from(this.decorators.values())
            .filter(decorator => decorator.isRunning()).length;
    }
}

/**
 * 预设配置 - 使用全局配色系统
 */
export const DecoratorPresets = {
    /** 默认闪烁星星 */
    SPARKLE: {
        text: '✨',
        color: Colors.accent,
        opacity: 0.8,
        animated: true,
        offsetX: 8
    } as DecoratorConfig,

    /** 简单箭头 */
    ARROW: {
        text: '→',
        color: Colors.textSecondary,
        opacity: 0.6,
        animated: false,
        offsetX: 5
    } as DecoratorConfig,

    /** 彩色光标 */
    COLORFUL: {
        text: '●',
        color: Colors.accent,
        opacity: 0.7,
        animated: true,
        offsetX: 6
    } as DecoratorConfig,

    /** 代码提示 */
    CODE_HINT: {
        text: '💡',
        color: Colors.warning,
        opacity: 0.9,
        animated: true,
        offsetX: 10
    } as DecoratorConfig,

    /** 写作模式 */
    WRITING: {
        text: '✍️',
        color: Colors.success,
        opacity: 0.6,
        animated: false,
        offsetX: 12
    } as DecoratorConfig
};