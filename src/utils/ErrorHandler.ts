// src/utils/ErrorHandler.ts
import * as vscode from 'vscode';

export enum ErrorCode {
    NETWORK_ERROR = 'NETWORK_ERROR',
    API_KEY_INVALID = 'API_KEY_INVALID',
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
    TIMEOUT = 'TIMEOUT',
    INVALID_REQUEST = 'INVALID_REQUEST',
    SERVER_ERROR = 'SERVER_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly userMessage: string;
    public readonly details?: any;

    constructor(
        code: ErrorCode,
        message: string,
        userMessage: string,
        details?: any
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.userMessage = userMessage;
        this.details = details;
    }
}

export class ErrorHandler {
    private static instance: ErrorHandler;

    private constructor() {}

    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * 处理错误并显示用户友好的消息
     */
    public handleError(error: any, context?: string): void {
        console.error(`[博客编写助手] 错误发生${context ? ` (${context})` : ''}:`, error);

        if (error instanceof AppError) {
            this.showErrorMessage(error.userMessage, error.code);
        } else if (error instanceof Error) {
            const appError = this.convertToAppError(error);
            this.showErrorMessage(appError.userMessage, appError.code);
        } else {
            this.showErrorMessage('发生了未知错误，请稍后重试', ErrorCode.UNKNOWN_ERROR);
        }
    }

    /**
     * 将普通错误转换为AppError
     */
    private convertToAppError(error: Error): AppError {
        const message = error.message.toLowerCase();

        if (message.includes('network') || message.includes('fetch')) {
            return new AppError(
                ErrorCode.NETWORK_ERROR,
                error.message,
                '网络连接失败，请检查网络设置后重试'
            );
        }

        if (message.includes('unauthorized') || message.includes('401')) {
            return new AppError(
                ErrorCode.API_KEY_INVALID,
                error.message,
                'API密钥无效，请在设置中检查并更新API密钥'
            );
        }

        if (message.includes('quota') || message.includes('429')) {
            return new AppError(
                ErrorCode.QUOTA_EXCEEDED,
                error.message,
                'API调用额度已用完，请稍后重试或检查账户余额'
            );
        }

        if (message.includes('timeout')) {
            return new AppError(
                ErrorCode.TIMEOUT,
                error.message,
                '请求超时，请稍后重试'
            );
        }

        if (message.includes('400') || message.includes('bad request')) {
            return new AppError(
                ErrorCode.INVALID_REQUEST,
                error.message,
                '请求参数错误，请检查输入内容'
            );
        }

        if (message.includes('500') || message.includes('502') || message.includes('503')) {
            return new AppError(
                ErrorCode.SERVER_ERROR,
                error.message,
                '服务器暂时不可用，请稍后重试'
            );
        }

        return new AppError(
            ErrorCode.UNKNOWN_ERROR,
            error.message,
            '发生了未知错误，请稍后重试'
        );
    }

    /**
     * 显示错误消息
     */
    private async showErrorMessage(message: string, code: ErrorCode): Promise<void> {
        const actions: string[] = [];

        switch (code) {
            case ErrorCode.API_KEY_INVALID:
                actions.push('打开设置');
                break;
            case ErrorCode.NETWORK_ERROR:
                actions.push('重试');
                break;
            case ErrorCode.QUOTA_EXCEEDED:
                actions.push('查看文档');
                break;
        }

        const choice = await vscode.window.showErrorMessage(message, ...actions);

        if (choice === '打开设置') {
            vscode.commands.executeCommand('blogWritingAssistant.openSettings');
        } else if (choice === '重试') {
            // 这里可以添加重试逻辑
        } else if (choice === '查看文档') {
            vscode.env.openExternal(vscode.Uri.parse('https://platform.openai.com/docs'));
        }
    }

    /**
     * 创建特定类型的错误
     */
    public createError(code: ErrorCode, details?: any): AppError {
        const errorMap = {
            [ErrorCode.NETWORK_ERROR]: {
                message: 'Network request failed',
                userMessage: '网络连接失败，请检查网络设置后重试'
            },
            [ErrorCode.API_KEY_INVALID]: {
                message: 'Invalid API key',
                userMessage: 'API密钥无效，请在设置中检查并更新API密钥'
            },
            [ErrorCode.QUOTA_EXCEEDED]: {
                message: 'API quota exceeded',
                userMessage: 'API调用额度已用完，请稍后重试或检查账户余额'
            },
            [ErrorCode.TIMEOUT]: {
                message: 'Request timeout',
                userMessage: '请求超时，请稍后重试'
            },
            [ErrorCode.INVALID_REQUEST]: {
                message: 'Invalid request parameters',
                userMessage: '请求参数错误，请检查输入内容'
            },
            [ErrorCode.SERVER_ERROR]: {
                message: 'Server error',
                userMessage: '服务器暂时不可用，请稍后重试'
            },
            [ErrorCode.UNKNOWN_ERROR]: {
                message: 'Unknown error',
                userMessage: '发生了未知错误，请稍后重试'
            }
        };

        const errorInfo = errorMap[code];
        return new AppError(code, errorInfo.message, errorInfo.userMessage, details);
    }

    /**
     * 包装异步函数，自动处理错误
     */
    public async withErrorHandling<T>(
        operation: () => Promise<T>,
        context?: string
    ): Promise<T | null> {
        try {
            return await operation();
        } catch (error) {
            this.handleError(error, context);
            return null;
        }
    }
}
