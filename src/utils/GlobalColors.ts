import * as vscode from 'vscode';

/**
 * 颜色主题类型
 */
export enum ColorTheme {
    LIGHT = 'light',
    DARK = 'dark',
    HIGH_CONTRAST = 'high-contrast'
}

/**
 * 全局颜色配置接口
 */
export interface ColorScheme {
    // 主要颜色
    primary: string;
    secondary: string;
    accent: string;
    
    // 文字颜色
    text: {
        primary: string;
        secondary: string;
        muted: string;
        disabled: string;
    };
    
    // 背景颜色
    background: {
        primary: string;
        secondary: string;
        transparent: string;
    };
    
    // 状态颜色
    status: {
        success: string;
        warning: string;
        error: string;
        info: string;
    };
    
    // 边框颜色
    border: {
        primary: string;
        secondary: string;
        focus: string;
    };
    
    // 装饰器专用颜色
    decorator: {
        text: string;
        background: string;
        stats: string;
    };
}

/**
 * 亮色主题配色方案 - 基于 #FFD900 黄金色
 */
const LIGHT_THEME: ColorScheme = {
    primary: '#FFD900',      // 主题金黄色
    secondary: '#B8A000',    // 深金色
    accent: '#FF6B35',       // 温暖橙色作为强调
    
    text: {
        primary: '#2D2D2D',     // 深灰，与金黄形成良好对比
        secondary: '#5A5A5A',   // 中灰
        muted: '#8A8A8A',       // 浅灰
        disabled: '#CCCCCC'     // 禁用色
    },
    
    background: {
        primary: '#FFFFFF',
        secondary: '#FEFDF8',   // 微黄背景
        transparent: 'transparent'
    },
    
    status: {
        success: '#4CAF50',     // 绿色
        warning: '#FFD900',     // 主题色作为警告色
        error: '#F44336',       // 红色
        info: '#2196F3'         // 蓝色
    },
    
    border: {
        primary: '#E8E2C8',     // 淡金色边框
        secondary: '#D4C896',   // 金色边框
        focus: '#FFD900'        // 焦点使用主题色
    },
    
    decorator: {
        text: '#B8A000',        // 深金色文字
        background: 'rgba(255, 217, 0, 0.1)',  // 淡金色背景
        stats: '#996F00'        // 更深的金色用于统计
    }
};

/**
 * 暗色主题配色方案 - 基于 #FFD900 但适配暗色环境
 */
const DARK_THEME: ColorScheme = {
    primary: '#FFD900',      // 保持主题金黄色
    secondary: '#CCB000',    // 稍深的金色
    accent: '#FF8A50',       // 暖橙色强调
    
    text: {
        primary: '#E8E8E8',     // 明亮文字
        secondary: '#C0C0C0',   // 次要文字
        muted: '#909090',       // 静音文字
        disabled: '#606060'     // 禁用文字
    },
    
    background: {
        primary: '#1E1E1E',     // 深色背景
        secondary: '#2A2A2A',   // 次要背景
        transparent: 'transparent'
    },
    
    status: {
        success: '#4CAF50',     // 绿色
        warning: '#FFD900',     // 主题色作为警告
        error: '#FF5252',       // 红色
        info: '#42A5F5'         // 蓝色
    },
    
    border: {
        primary: '#404040',     // 深色边框
        secondary: '#505050',   // 次要边框
        focus: '#FFD900'        // 焦点金黄色
    },
    
    decorator: {
        text: '#FFD900',        // 金黄色装饰文字
        background: 'rgba(255, 217, 0, 0.08)',  // 极淡金色背景
        stats: '#E6C200'        // 亮金色统计
    }
};

/**
 * 高对比度主题配色方案 - 保持 #FFD900 的可访问性
 */
const HIGH_CONTRAST_THEME: ColorScheme = {
    primary: '#FFD900',      // 金黄色在黑色背景上有良好对比
    secondary: '#FFFFFF',    // 纯白作为次要色
    accent: '#FFFF00',       // 亮黄色强调
    
    text: {
        primary: '#FFFFFF',     // 纯白文字
        secondary: '#FFD900',   // 金黄色次要文字
        muted: '#C0C0C0',       // 银灰静音
        disabled: '#808080'     // 灰色禁用
    },
    
    background: {
        primary: '#000000',     // 纯黑背景
        secondary: '#1A1A1A',   // 深灰背景
        transparent: 'transparent'
    },
    
    status: {
        success: '#00FF00',     // 亮绿
        warning: '#FFD900',     // 主题金黄
        error: '#FF0000',       // 亮红
        info: '#00FFFF'         // 青色
    },
    
    border: {
        primary: '#FFD900',     // 金黄边框
        secondary: '#FFFFFF',   // 白色边框
        focus: '#FFFF00'        // 亮黄焦点
    },
    
    decorator: {
        text: '#FFD900',        // 金黄装饰文字
        background: 'rgba(255, 217, 0, 0.15)',  // 更明显的金色背景
        stats: '#FFFF00'        // 亮黄统计文字
    }
};

/**
 * 全局颜色管理器
 */
export class GlobalColors {
    private static instance: GlobalColors | null = null;
    private currentTheme: ColorTheme;
    private currentScheme: ColorScheme;

    private constructor() {
        this.currentTheme = this.detectCurrentTheme();
        this.currentScheme = this.getSchemeForTheme(this.currentTheme);
        
        // 监听主题变化
        vscode.window.onDidChangeActiveColorTheme(() => {
            this.updateTheme();
        });
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): GlobalColors {
        if (!GlobalColors.instance) {
            GlobalColors.instance = new GlobalColors();
        }
        return GlobalColors.instance;
    }

    /**
     * 检测当前主题
     */
    private detectCurrentTheme(): ColorTheme {
        const colorTheme = vscode.window.activeColorTheme;
        
        switch (colorTheme.kind) {
            case vscode.ColorThemeKind.Light:
                return ColorTheme.LIGHT;
            case vscode.ColorThemeKind.Dark:
                return ColorTheme.DARK;
            case vscode.ColorThemeKind.HighContrast:
                return ColorTheme.HIGH_CONTRAST;
            default:
                return ColorTheme.DARK;
        }
    }

    /**
     * 根据主题获取配色方案
     */
    private getSchemeForTheme(theme: ColorTheme): ColorScheme {
        switch (theme) {
            case ColorTheme.LIGHT:
                return LIGHT_THEME;
            case ColorTheme.DARK:
                return DARK_THEME;
            case ColorTheme.HIGH_CONTRAST:
                return HIGH_CONTRAST_THEME;
            default:
                return DARK_THEME;
        }
    }

    /**
     * 更新主题
     */
    private updateTheme(): void {
        const newTheme = this.detectCurrentTheme();
        if (newTheme !== this.currentTheme) {
            this.currentTheme = newTheme;
            this.currentScheme = this.getSchemeForTheme(newTheme);
        }
    }

    /**
     * 获取当前配色方案
     */
    public getColorScheme(): ColorScheme {
        return this.currentScheme;
    }

    /**
     * 获取当前主题类型
     */
    public getCurrentTheme(): ColorTheme {
        return this.currentTheme;
    }

    /**
     * 获取特定颜色值
     */
    public getColor(path: string): string {
        const parts = path.split('.');
        let current: any = this.currentScheme;
        
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                console.warn(`Color path '${path}' not found`);
                return '#CCCCCC'; // 默认颜色
            }
        }
        
        return typeof current === 'string' ? current : '#CCCCCC';
    }

    /**
     * 检查是否为暗色主题
     */
    public isDarkTheme(): boolean {
        return this.currentTheme === ColorTheme.DARK || this.currentTheme === ColorTheme.HIGH_CONTRAST;
    }

    /**
     * 检查是否为亮色主题
     */
    public isLightTheme(): boolean {
        return this.currentTheme === ColorTheme.LIGHT;
    }

    /**
     * 检查是否为高对比度主题
     */
    public isHighContrastTheme(): boolean {
        return this.currentTheme === ColorTheme.HIGH_CONTRAST;
    }
}

/**
 * 便捷的颜色获取函数
 */
export function getColor(path: string): string {
    return GlobalColors.getInstance().getColor(path);
}

/**
 * 获取当前配色方案
 */
export function getColorScheme(): ColorScheme {
    return GlobalColors.getInstance().getColorScheme();
}

/**
 * 预定义的颜色常量（最常用的）
 */
export const Colors = {
    // 快捷访问常用颜色
    get primary() { return getColor('primary'); },
    get secondary() { return getColor('secondary'); },
    get accent() { return getColor('accent'); },
    
    // 文字颜色
    get textPrimary() { return getColor('text.primary'); },
    get textSecondary() { return getColor('text.secondary'); },
    get textMuted() { return getColor('text.muted'); },
    
    // 装饰器颜色
    get decoratorText() { return getColor('decorator.text'); },
    get decoratorBackground() { return getColor('decorator.background'); },
    get decoratorStats() { return getColor('decorator.stats'); },
    
    // 状态颜色
    get success() { return getColor('status.success'); },
    get warning() { return getColor('status.warning'); },
    get error() { return getColor('status.error'); },
    get info() { return getColor('status.info'); }
};