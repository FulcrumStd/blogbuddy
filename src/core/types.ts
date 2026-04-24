import { TextBlockChunk } from '../utils/TextBlockProcessor';

export enum BBCmd {
    NORMAL = 'bb',          // 直接给 Bgent 指令
    EXPAND = 'bb-expd',     // 扩写
    IMPROVE = 'bb-impv',    // 润色
    MERMAID = 'bb-mmd',     // 生成 Mermaid
    TRANSLATE = 'bb-tslt',  // 翻译
    KEYWORD = 'bb-kwd',     // 提取关键词
    TLDR = 'bb-tldr',       // 加入省流
    TAG = 'bb-tag',         // 加入 BBtag
}

/**
 * 统一的处理请求接口
 * 所有处理器都使用这个接口作为输入
 */
export interface ProcessRequest {
    selectText: string;      // 用户选中的文本（去除了 BB 标签）
    filePath: string;        // 文本所在文件的路径
    msg: string;             // 用户的附加消息或指令
    cmd: BBCmd;             // 用于标识命令类型
    cmdText: string;        //  匹配到的 BB 标签内容
}

/**
 * 统一的处理响应接口
 * 所有处理器都返回这个接口
 */
export interface ProcessResponse {
    replaceText: string;     // 替换掉用户选择文本的内容
}

export type ProcessChunk = TextBlockChunk;

/**
 * 处理器统一接口
 * 所有核心处理器都实现这个接口，统一走流式路径
 */
export interface Processor {
    process(
        request: ProcessRequest,
    ): Promise<AsyncGenerator<ProcessChunk, ProcessResponse, unknown>>;
}
