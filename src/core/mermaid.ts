import { Utils } from '../utils/helpers';
import { AIService } from '../services/AIService';
import { AppError, ErrorCode } from '../utils/ErrorHandler';
import { ProcessRequest, ProcessResponse, ProcessChunk, Processor } from './types';

const MERMAID_DIAGRAM_PREFIXES = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
    'stateDiagram', 'erDiagram', 'gantt', 'pie', 'gitgraph',
    'mindmap', 'timeline', 'zenuml',
];

export class MermaidGenerator implements Processor {
    private static instance: MermaidGenerator = new MermaidGenerator();
    private constructor() { }

    public static getInstance(): MermaidGenerator {
        return MermaidGenerator.instance;
    }

    public async process(
        request: ProcessRequest,
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>> {
        const generator = async function* (this: MermaidGenerator): AsyncGenerator<ProcessChunk, ProcessResponse, unknown> {
            const completePrompt = this.generateCompleteMermaidPrompt(request.selectText, request.msg);
            const messages: Array<any> = [{ role: 'user', content: completePrompt }];

            const aiService = AIService.getInstance();
            const streamGenerator = await aiService.chatStreaming(messages, 'MERMAID');

            // Emit the opening fence up-front so the output is usable mid-stream.
            yield { text: '```mermaid\n' };

            let fullResponse = '';
            for await (const chunk of streamGenerator) {
                fullResponse += chunk;
                yield { text: chunk };
            }

            yield { text: '\n```' };

            const mermaidCode = this.extractMermaidCode(fullResponse);
            const validation = this.validateMermaidCode(mermaidCode);
            if (!validation.isValid) {
                throw new AppError(
                    ErrorCode.SERVER_ERROR,
                    `Generated Mermaid code is invalid: ${validation.error}`,
                    'Mermaid code validation failed',
                );
            }

            return { replaceText: `\`\`\`mermaid\n${mermaidCode}\n\`\`\`` };
        }.bind(this);

        return generator();
    }

    private validateMermaidCode(mermaidCode: string): { isValid: boolean; error?: string } {
        const trimmed = mermaidCode.trim();
        if (!trimmed) { return { isValid: false, error: 'Mermaid code is empty' }; }
        const lower = trimmed.toLowerCase();
        const hasValidPrefix = MERMAID_DIAGRAM_PREFIXES.some(p => lower.startsWith(p.toLowerCase()));
        if (!hasValidPrefix) {
            return {
                isValid: false,
                error: `Mermaid code should start with one of: ${MERMAID_DIAGRAM_PREFIXES.join(', ')}`,
            };
        }
        return { isValid: true };
    }

    private extractMermaidCode(response: string): string {
        let code = response.trim();
        code = code.replace(/^```(?:mermaid)?\s*\n/, '');
        code = code.replace(/\n```\s*$/, '');

        const lines = code.split('\n');
        const startIndex = lines.findIndex(line =>
            MERMAID_DIAGRAM_PREFIXES.some(prefix =>
                line.trim().toLowerCase().startsWith(prefix.toLowerCase()),
            ),
        );
        if (startIndex !== -1) {
            code = lines.slice(startIndex).join('\n');
        }
        return code.trim();
    }

    private generateCompleteMermaidPrompt(text: string, userMsg: string): string {
        const basePrompt = this.buildMermaidPrompt(text);
        return this.addUserInstructions(basePrompt, userMsg);
    }

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

    private addUserInstructions(basePrompt: string, userMsg: string): string {
        if (Utils.isEmpty(userMsg)) { return basePrompt; }
        return `${basePrompt}

## Additional User Instructions:
${userMsg}

Please incorporate these instructions while generating the Mermaid diagram.`;
    }
}
