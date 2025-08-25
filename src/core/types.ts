import { BBCmd } from './bb';
import { StreamingOptions } from '../utils/StreamingTextWriter';

/**
 * 统一的处理请求接口
 * 所有处理器都使用这个接口作为输入
 */
export interface ProcessRequest {
    selectText: string;      // 包含 BBCmd 的文本或需要处理的文本
    filePath: string;        // 文本所在文件的路径
    msg: string;             // 用户的附加消息或指令
    cmd: BBCmd;             // 用于标识命令类型
}

/**
 * 统一的处理响应接口
 * 所有处理器都返回这个接口
 */
export interface ProcessResponse {
    replaceText: string;     // 替换掉用户选择文本的内容
    success?: boolean;       // 可选，处理是否成功（向后兼容）
    result?: string;         // 可选，处理结果消息（向后兼容）
}

/**
 * 统一的流式响应接口
 */
export interface StreamingResponse {
    stream: AsyncGenerator<string, ProcessResponse, unknown>;
}

// 重用utils中的StreamingOptions以保持兼容性
export type { StreamingOptions };

/**
 * 处理器统一接口
 * 所有核心处理器都应该实现这个接口
 */
export interface Processor {
    /**
     * 处理请求的核心方法
     * @param request 处理请求
     * @returns 处理响应
     */
    process(request: ProcessRequest): Promise<ProcessResponse>;
}

/**
 * 流式处理器接口
 * 支持流式输出的处理器应该实现这个接口
 */
export interface StreamingProcessor extends Processor {
    /**
     * 流式处理请求的方法
     * @param request 处理请求
     * @param options 流式处理选项
     * @returns 异步生成器，逐步输出结果
     */
    processStreaming(
        request: ProcessRequest, 
        options?: StreamingOptions
    ): Promise<AsyncGenerator<string, ProcessResponse, unknown>>;
}