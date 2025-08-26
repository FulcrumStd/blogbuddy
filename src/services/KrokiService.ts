import * as fs from 'fs';
import * as path from 'path';
import { AppError, ErrorCode } from '../utils/ErrorHandler';

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
            const svgContent = await this.renderMermaidToSVG(mermaidCode);

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
     * 渲染 Mermaid 图表为 SVG
     */
    private async renderMermaidToSVG(diagramCode: string): Promise<string> {
        try {
            // 使用 JSON POST 请求到根路径
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'image/svg+xml',
                    'User-Agent': 'BlogBuddy/1.0'
                },
                body: JSON.stringify({
                    diagram_source: diagramCode,
                    diagram_type: 'mermaid',
                    output_format: 'svg'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();
        } catch (error) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                `Failed to render Mermaid diagram: ${error instanceof Error ? error.message : 'Unknown error'}`,
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