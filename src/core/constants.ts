export enum BBCmd {
    NORMAL = 'bb',      // 直接给 Bgent 指令
    EXPAND = 'exp',     // 扩写
    IMPROVE = 'imp',    // 润色
    CHECK = 'ck',       // 检查错误
    MERMAID = 'mmd',    // 生成 Mermaid
    TRANSLATE = 'ts',   // 翻译
    KEYWORD = 'kwd',    // 提取关键词
    TLDR = 'tldr',      // 加入省流
    TAG = 'tag',        // 加入 BBtag
    USAGE = 'usage',    // 统计 BB 的 token use
}