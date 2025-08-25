import { Utils} from '../utils/helpers';
import { AIProxy } from '../utils/aiProxy';
import { KrokiService } from '../services/KrokiService';
import { ConfigService, ConfigKey } from '../services/ConfigService';
import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { ProcessRequest, ProcessResponse, ProcessChunk, Processor, StreamingProcessor } from './types';
import * as path from 'path';

export class MermaidGenerator implements StreamingProcessor {
    private static instance: MermaidGenerator = new MermaidGenerator();
    private constructor() { }

    public static getInstance(): MermaidGenerator {
        return MermaidGenerator.instance;
    }

    /**
     * 处理 Mermaid 生成请求 - 真正的 Mermaid 生成功能
     */
    public async process(request: ProcessRequest): Promise<ProcessResponse> {
        // 生成 Mermaid 代码
        const mermaidCode = await this.generateMermaidCode(request);

        // 获取配置决定输出方式
        const configService = ConfigService.getInstance();
        const mermaidCodeConfig = configService.get<boolean>(ConfigKey.MERMAID_CODE, false);

        if (mermaidCodeConfig) {
            // 返回代码块形式
            const codeBlock = `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
            return {
                replaceText: codeBlock
            };
        } else {
            // 生成 SVG 图片
            const imagePath = await this.generateSVGImage(mermaidCode, request.filePath);
            const markdownImage = `![Mermaid Diagram](${path.basename(imagePath)})`;

            return {
                replaceText: markdownImage
            };
        }
    }

    /**
     * 统一的流式处理接口实现
     */
    public async processStreaming(
        request: ProcessRequest
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: MermaidGenerator): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            // 获取配置决定输出方式
            const configService = ConfigService.getInstance();
            const mermaidCodeConfig = configService.get<boolean>(ConfigKey.MERMAID_CODE, false);

            // 流式生成 Mermaid 代码
            let mermaidCode = '';
            let hasStarted = false;
            
            for await (const chunk of await this.generateMermaidCodeStreaming(request)) {
                if (!hasStarted) {
                    // 第一个块时输出代码块开始标记
                    yield { text: '```mermaid\n' };
                    hasStarted = true;
                }
                
                mermaidCode += chunk.text;
                yield chunk;
            }

            // 输出代码块结束标记
            yield { text: '\n```' };

            if (mermaidCodeConfig) {
                // 代码模式：直接返回代码块
                return {
                    replaceText: `\`\`\`mermaid\n${mermaidCode}\n\`\`\``
                };
            } else {
                // 图片模式：生成 SVG 图片并替换代码块
                const imagePath = await this.generateSVGImage(mermaidCode, request.filePath);
                const markdownImage = `![Mermaid Diagram](${path.basename(imagePath)})`;
                
                // 使用 replace: true 替换之前流式输出的代码
                yield { text: markdownImage, replace: true };
                
                return {
                    replaceText: markdownImage
                };
            }
        }.bind(this);

        return generator();
    }

    /**
     * 使用 AI 生成 Mermaid 代码
     */
    private async generateMermaidCode(request: ProcessRequest): Promise<string> {
        const completePrompt = this.generateCompleteMermaidPrompt(request.selectText, request.msg);

        // 准备消息
        const messages: Array<any> = [];
        messages.push({ role: 'user', content: completePrompt });

        // 调用AI生成Mermaid代码
        const aiProxy = AIProxy.getInstance();
        const response = await aiProxy.chat(messages, 'MERMAID');

        // 提取 Mermaid 代码（移除可能的代码块标记）
        const mermaidCode = this.extractMermaidCode(response);

        // 验证生成的代码
        const krokiService = KrokiService.getInstance();
        const validation = krokiService.validateMermaidCode(mermaidCode);
        if (!validation.isValid) {
            throw new AppError(
                ErrorCode.SERVER_ERROR,
                `Generated Mermaid code is invalid: ${validation.error}`,
                'Mermaid code validation failed'
            );
        }

        return mermaidCode;
    }

    /**
     * 使用 AI 流式生成 Mermaid 代码
     */
    private async generateMermaidCodeStreaming(request: ProcessRequest): Promise<AsyncGenerator<ProcessChunk, string, unknown>> {
        const generator = async function* (this: MermaidGenerator): AsyncGenerator<ProcessChunk, string, unknown> {
            const completePrompt = this.generateCompleteMermaidPrompt(request.selectText, request.msg);

            // 准备消息
            const messages: Array<any> = [];
            messages.push({ role: 'user', content: completePrompt });

            // 调用AI流式生成Mermaid代码
            const aiProxy = AIProxy.getInstance();
            const streamGenerator = await aiProxy.chatStreamingSimple(messages, 'MERMAID');

            let fullResponse = '';
            for await (const chunk of streamGenerator) {
                fullResponse += chunk;
                yield { text: chunk };
            }

            // 提取 Mermaid 代码（移除可能的代码块标记）
            const mermaidCode = this.extractMermaidCode(fullResponse);

            // 验证生成的代码
            const krokiService = KrokiService.getInstance();
            const validation = krokiService.validateMermaidCode(mermaidCode);
            if (!validation.isValid) {
                throw new AppError(
                    ErrorCode.SERVER_ERROR,
                    `Generated Mermaid code is invalid: ${validation.error}`,
                    'Mermaid code validation failed'
                );
            }

            return mermaidCode;
        }.bind(this);

        return generator();
    }

    /**
     * 生成 SVG 图片
     */
    private async generateSVGImage(mermaidCode: string, filePath: string): Promise<string> {
        const krokiService = KrokiService.getInstance();

        // 生成文件名和路径
        const fileDir = path.dirname(filePath);
        const fileName = krokiService.generateFileName('mermaid', 'svg');
        const savePath = path.join(fileDir, fileName);

        // 使用 Kroki 服务生成 SVG
        return await krokiService.generateMermaidSVG(mermaidCode, savePath);
    }

    /**
     * 从AI响应中提取纯净的Mermaid代码
     */
    private extractMermaidCode(response: string): string {
        // 移除可能的代码块标记
        let code = response.trim();

        // 移除 ```mermaid 和 ```
        code = code.replace(/^```(?:mermaid)?\s*\n/, '');
        code = code.replace(/\n```\s*$/, '');

        // 移除可能的解释文字（保留第一个图表定义开始的部分）
        const lines = code.split('\n');
        const validPrefixes = [
            'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
            'stateDiagram', 'erDiagram', 'gantt', 'pie', 'gitgraph',
            'mindmap', 'timeline', 'zenuml'
        ];

        const startIndex = lines.findIndex(line =>
            validPrefixes.some(prefix =>
                line.trim().toLowerCase().startsWith(prefix.toLowerCase())
            )
        );

        if (startIndex !== -1) {
            code = lines.slice(startIndex).join('\n');
        }

        return code.trim();
    }

    /**
     * 生成完整的 Mermaid 提示词（集中处理所有提示词逻辑）
     */
    private generateCompleteMermaidPrompt(text: string, userMsg: string): string {
        const basePrompt = this.buildMermaidPrompt(text);
        return this.addUserInstructions(basePrompt, userMsg);
    }

    /**
     * 构建基础 Mermaid 提示词
     */
    private buildMermaidPrompt(text: string): string {
        return `You are a Mermaid diagram specialist. Your task is to create a Mermaid diagram based on the provided text or requirements.

## Diagram Guidelines:
- **Proper Syntax**: Use correct Mermaid.js syntax for the chosen diagram type
- **Clear Structure**: Create logical, easy-to-understand visual representations
- **Appropriate Type**: Choose the most suitable diagram type (flowchart, sequence, class, etc.)
- **Clean Code**: Generate only the Mermaid code without markdown blocks or explanations
- **No Decorations**: Avoid unnecessary styling or decorative elements

## Common Diagram Types:
- **Flowchart**: \`flowchart TD\` or \`graph TD\` for process flows
- **Sequence**: \`sequenceDiagram\` for interactions over time
- **Class**: \`classDiagram\` for object-oriented structures
- **State**: \`stateDiagram-v2\` for state transitions
- **ER**: \`erDiagram\` for database relationships
- **Gantt**: \`gantt\` for project timelines
- **Pie**: \`pie title Chart Title\` for data visualization

## Content Analysis:
<text>
${text}
</text>

## Output Requirements:
Return ONLY the Mermaid diagram code. Do not include:
- Code block markers (\`\`\`)
- Explanatory text
- Multiple diagram options
- Styling suggestions

The output should start directly with the diagram type declaration (e.g., "flowchart TD", "sequenceDiagram", etc.).`;
    }

    /**
     * 添加用户附加指令到提示词
     */
    private addUserInstructions(basePrompt: string, userMsg: string): string {
        if (Utils.isEmpty(userMsg)) {
            return basePrompt;
        }

        return `${basePrompt}

## Additional User Instructions:
${userMsg}

Please incorporate these instructions while generating the Mermaid diagram.`;
    }

}