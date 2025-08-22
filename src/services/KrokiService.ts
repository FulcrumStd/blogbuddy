import * as fs from 'fs';
import * as path from 'path';
import { AppError, ErrorCode } from '../utils/ErrorHandler';

export interface KrokiOptions {
    diagramType: 'mermaid' | 'plantuml' | 'graphviz';
    outputFormat: 'svg' | 'png' | 'pdf';
}

export class KrokiService {
    private static instance: KrokiService = new KrokiService();
    private readonly baseUrl = 'https://kroki.io';
    
    private constructor() { }
    
    public static getInstance(): KrokiService {
        return KrokiService.instance;
    }

    /**
     * 将 Mermaid 代码转换为 SVG 并保存到文件
     */
    public async generateMermaidSVG(mermaidCode: string, savePath: string): Promise<string> {
        try {
            const svgContent = await this.renderDiagram(mermaidCode, {
                diagramType: 'mermaid',
                outputFormat: 'svg'
            });

            // 确保目录存在
            const dir = path.dirname(savePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // 保存 SVG 文件
            await fs.promises.writeFile(savePath, svgContent, 'utf-8');
            
            return savePath;
        } catch (error) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                `Failed to generate Mermaid SVG: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'Kroki service failed'
            );
        }
    }

    /**
     * 渲染图表
     */
    private async renderDiagram(diagramCode: string, options: KrokiOptions): Promise<string> {
        try {
            // 将图表代码编码为 Base64
            const encodedDiagram = Buffer.from(diagramCode, 'utf-8').toString('base64');
            
            // 构建 kroki.io URL
            const url = `${this.baseUrl}/${options.diagramType}/${options.outputFormat}/${encodedDiagram}`;
            
            // 发送请求
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': options.outputFormat === 'svg' ? 'image/svg+xml' : `image/${options.outputFormat}`,
                    'User-Agent': 'BlogBuddy/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();
        } catch (error) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                `Failed to render diagram: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'Kroki API request failed'
            );
        }
    }

    /**
     * 验证 Mermaid 代码是否有效（基本检查）
     */
    public validateMermaidCode(mermaidCode: string): { isValid: boolean; error?: string } {
        if (!mermaidCode || mermaidCode.trim().length === 0) {
            return { isValid: false, error: 'Mermaid code is empty' };
        }

        // 基本的 Mermaid 语法检查
        const trimmedCode = mermaidCode.trim();
        const validPrefixes = [
            'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
            'stateDiagram', 'erDiagram', 'gantt', 'pie', 'gitgraph',
            'mindmap', 'timeline', 'zenuml'
        ];

        const hasValidPrefix = validPrefixes.some(prefix => 
            trimmedCode.toLowerCase().startsWith(prefix.toLowerCase())
        );

        if (!hasValidPrefix) {
            return { 
                isValid: false, 
                error: `Mermaid code should start with one of: ${validPrefixes.join(', ')}` 
            };
        }

        return { isValid: true };
    }

    /**
     * 生成唯一的文件名
     */
    public generateFileName(baseName: string, extension: string): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const random = Math.random().toString(36).substring(2, 8);
        return `${baseName}_${timestamp}_${random}.${extension}`;
    }
}