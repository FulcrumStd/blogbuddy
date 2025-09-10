export interface MarkdownStats {
    /** 总字符数（包含所有字符） */
    totalCharacters: number;
    /** 中文字符数 */
    chineseCharacters: number;
    /** 英文单词数 */
    englishWords: number;
    /** 数字数量 */
    numbers: number;
    /** 标点符号数量 */
    punctuation: number;
    /** 空格数量 */
    spaces: number;
    /** 章节统计 */
    sections: SectionStats;
    /** 代码块统计 */
    codeBlocks: number;
    /** 链接数量 */
    links: number;
    /** 图片数量 */
    images: number;
}

export interface SectionStats {
    /** 各级标题数量 h1-h6 */
    headings: {
        h1: number;
        h2: number;
        h3: number;
        h4: number;
        h5: number;
        h6: number;
    };
    /** 总章节数 */
    totalSections: number;
    /** 章节层次结构 */
    structure: SectionNode[];
}

export interface SectionNode {
    /** 标题级别 1-6 */
    level: number;
    /** 标题文本 */
    title: string;
    /** 在文档中的位置 */
    position: number;
    /** 子章节 */
    children: SectionNode[];
}

export interface AnalysisOptions {
    /** 是否包含空格在字符统计中 */
    includeSpaces?: boolean;
    /** 是否统计代码块内容 */
    includeCodeBlocks?: boolean;
    /** 是否统计链接文本 */
    includeLinkText?: boolean;
    /** 是否统计图片alt文本 */
    includeImageAlt?: boolean;
    /** 自定义中文字符正则（可选） */
    chineseCharRegex?: RegExp;
}

export class MarkdownStatsAnalyzer {
    private readonly DEFAULT_CHINESE_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
    private readonly ENGLISH_WORD_REGEX = /\b[a-zA-Z]+(?:'[a-zA-Z]*)?/g;
    private readonly NUMBER_REGEX = /\$?\d+(?:\.\d+)?/g;
    private readonly PUNCTUATION_REGEX = /[.,;:!?'"()[\]{}\-–—$]/g;
    private readonly HEADING_REGEX = /^(#{1,6})\s+(.+)$/gm;
    private readonly CODE_BLOCK_REGEX = /```[\s\S]*?```|`[^`\n]+`/g;
    private readonly LINK_REGEX = /\[([^\]]*)\]\([^\)]+\)/g;
    private readonly IMAGE_REGEX = /!\[([^\]]*)\]\([^\)]+\)/g;

    constructor(private options: AnalysisOptions = {}) {}

    public analyze(markdownContent: string): MarkdownStats {
        const processedContent = this.preprocessContent(markdownContent);
        
        return {
            totalCharacters: this.countTotalCharacters(processedContent),
            chineseCharacters: this.countChineseCharacters(processedContent),
            englishWords: this.countEnglishWords(processedContent),
            numbers: this.countNumbers(processedContent),
            punctuation: this.countPunctuation(processedContent),
            spaces: this.countSpaces(markdownContent),
            sections: this.analyzeSections(markdownContent),
            codeBlocks: this.countCodeBlocks(markdownContent),
            links: this.countLinks(markdownContent),
            images: this.countImages(markdownContent)
        };
    }

    private preprocessContent(content: string): string {
        let processed = content;

        // 移除代码块（如果配置要求）
        if (!this.options.includeCodeBlocks) {
            processed = processed.replace(this.CODE_BLOCK_REGEX, '');
        }

        // 先处理图片（因为图片语法包含链接语法，必须先处理）
        if (!this.options.includeImageAlt) {
            this.IMAGE_REGEX.lastIndex = 0;
            processed = processed.replace(this.IMAGE_REGEX, '');
        } else {
            this.IMAGE_REGEX.lastIndex = 0;
            processed = processed.replace(this.IMAGE_REGEX, '$1');
        }

        // 然后处理链接
        if (!this.options.includeLinkText) {
            this.LINK_REGEX.lastIndex = 0;
            processed = processed.replace(this.LINK_REGEX, '');
        } else {
            this.LINK_REGEX.lastIndex = 0;
            processed = processed.replace(this.LINK_REGEX, '$1');
        }

        return processed;
    }

    private countTotalCharacters(content: string): number {
        if (this.options.includeSpaces !== false) {
            return content.length;
        }
        return content.replace(/\s/g, '').length;
    }

    private countChineseCharacters(content: string): number {
        const regex = this.options.chineseCharRegex || this.DEFAULT_CHINESE_REGEX;
        const matches = content.match(regex);
        return matches ? matches.length : 0;
    }

    private countEnglishWords(content: string): number {
        const matches = content.match(this.ENGLISH_WORD_REGEX);
        return matches ? matches.length : 0;
    }

    private countNumbers(content: string): number {
        const matches = content.match(this.NUMBER_REGEX);
        return matches ? matches.length : 0;
    }

    private countPunctuation(content: string): number {
        const matches = content.match(this.PUNCTUATION_REGEX);
        return matches ? matches.length : 0;
    }

    private countSpaces(content: string): number {
        const matches = content.match(/\s/g);
        return matches ? matches.length : 0;
    }

    private countCodeBlocks(content: string): number {
        const matches = content.match(this.CODE_BLOCK_REGEX);
        return matches ? matches.length : 0;
    }

    private countLinks(content: string): number {
        const matches = content.match(this.LINK_REGEX);
        return matches ? matches.length : 0;
    }

    private countImages(content: string): number {
        // Reset lastIndex to avoid state issues with global regex
        this.IMAGE_REGEX.lastIndex = 0;
        const matches = content.match(this.IMAGE_REGEX);
        return matches ? matches.length : 0;
    }

    private analyzeSections(content: string): SectionStats {
        const headings = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
        const structure: SectionNode[] = [];
        const stack: SectionNode[] = [];
        
        let match;
        this.HEADING_REGEX.lastIndex = 0;
        
        while ((match = this.HEADING_REGEX.exec(content)) !== null) {
            const level = match[1].length;
            const title = match[2].trim();
            const position = match.index;
            
            // 更新标题计数
            switch (level) {
                case 1: headings.h1++; break;
                case 2: headings.h2++; break;
                case 3: headings.h3++; break;
                case 4: headings.h4++; break;
                case 5: headings.h5++; break;
                case 6: headings.h6++; break;
            }
            
            const node: SectionNode = {
                level,
                title,
                position,
                children: []
            };
            
            // 构建层次结构
            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }
            
            if (stack.length === 0) {
                structure.push(node);
            } else {
                stack[stack.length - 1].children.push(node);
            }
            
            stack.push(node);
        }
        
        const totalSections = headings.h1 + headings.h2 + headings.h3 + 
                             headings.h4 + headings.h5 + headings.h6;
        
        return {
            headings,
            totalSections,
            structure
        };
    }

    public static formatStats(stats: MarkdownStats): string {
        const lines = [
            '📊 Markdown 文档统计',
            '',
            '📝 字数统计:',
            `   总字符数: ${stats.totalCharacters.toLocaleString()}`,
            `   中文字符: ${stats.chineseCharacters.toLocaleString()}`,
            `   英文单词: ${stats.englishWords.toLocaleString()}`,
            `   数字: ${stats.numbers.toLocaleString()}`,
            `   标点符号: ${stats.punctuation.toLocaleString()}`,
            `   空格: ${stats.spaces.toLocaleString()}`,
            '',
            '📋 结构统计:',
            `   总章节数: ${stats.sections.totalSections}`,
            `   H1: ${stats.sections.headings.h1}`,
            `   H2: ${stats.sections.headings.h2}`,
            `   H3: ${stats.sections.headings.h3}`,
            `   H4: ${stats.sections.headings.h4}`,
            `   H5: ${stats.sections.headings.h5}`,
            `   H6: ${stats.sections.headings.h6}`,
            '',
            '🔗 内容统计:',
            `   代码块: ${stats.codeBlocks}`,
            `   链接: ${stats.links}`,
            `   图片: ${stats.images}`
        ];
        
        return lines.join('\n');
    }
}