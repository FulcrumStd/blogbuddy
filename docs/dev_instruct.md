# BlogBuddy 开发说明

## 项目概述

BlogBuddy 是一个 VS Code 扩展，为 Markdown 写作提供 AI 辅助功能。用户通过在文档中插入特定命令标签（如 `<bb-expd:...>`、`<bb-impv:...>` 等），然后使用快捷键触发 AI 处理，实现文本扩展、改进、翻译等功能。

## 项目目录结构

```
blogbuddy/
├── src/                      # 源代码目录
│   ├── commands/             # 命令处理模块
│   │   ├── index.ts          # 命令注册入口
│   │   ├── bbCommand.ts      # BB 主命令处理
│   │   └── menuCommand.ts    # 菜单命令处理
│   ├── core/                 # 核心功能模块
│   │   ├── bb.ts            # 主控制器，定义命令枚举和处理分发
│   │   ├── expander.ts      # 文本扩展功能
│   │   ├── improve.ts       # 文本改进功能
│   │   ├── translator.ts    # 翻译功能
│   │   ├── tldr.ts          # 摘要生成功能
│   │   ├── keyword.ts       # 关键词提取功能
│   │   ├── mermaid.ts       # Mermaid 图表生成功能
│   │   └── normal.ts        # 通用 AI 处理功能
│   ├── services/            # 服务层
│   │   ├── ConfigService.ts  # 配置管理服务
│   │   ├── ConfigWatcher.ts  # 配置监听服务
│   │   └── KrokiService.ts   # Kroki 图表渲染服务
│   ├── utils/               # 工具类
│   │   ├── aiProxy.ts       # AI 接口代理，统一管理 OpenAI 调用
│   │   ├── helpers.ts       # 通用工具函数
│   │   ├── ErrorHandler.ts  # 错误处理工具
│   │   └── DocumentLock.ts  # 文档锁定管理
│   ├── test/                # 测试文件
│   └── extension.ts         # 扩展入口文件
├── docs/                    # 文档目录
├── images/                  # 图片资源
├── package.json             # 扩展配置和依赖
├── tsconfig.json           # TypeScript 配置
├── esbuild.js              # 构建配置
└── eslint.config.mjs       # ESLint 配置
```

## 核心架构

### 1. 扩展入口 (extension.ts)
- 激活扩展时注册所有命令
- 初始化配置监听器
- 管理扩展生命周期

### 2. 命令系统 (commands/)
- **bbCommand.ts**: 处理主要的 BB 命令，解析用户选中的文本，提取命令标签和参数
- **menuCommand.ts**: 处理菜单命令，提供用户界面选择
- **index.ts**: 统一注册所有命令到 VS Code

### 3. 核心处理器 (core/)
- **bb.ts**: 核心控制器，定义了所有支持的命令类型（BBCmd 枚举）和请求/响应接口
- 各功能模块（expander、improve、translator 等）：实现具体的 AI 处理逻辑
- 每个模块都遵循统一的接口规范，接收 Bquest 对象，返回处理结果

### 4. 服务层 (services/)
- **ConfigService**: 单例模式管理扩展配置（API Key、模型、Base URL 等）
- **ConfigWatcher**: 监听配置变更，动态更新 AI 客户端
- **KrokiService**: 处理 Mermaid 图表的渲染服务

### 5. 工具层 (utils/)
- **aiProxy**: AI 接口的统一代理，管理 OpenAI 客户端实例和使用统计
- **DocumentLock**: 防止并发处理同一文档时的冲突
- **ErrorHandler**: 统一的错误处理和用户提示
- **helpers**: 通用工具函数

## 主要数据流

1. **用户触发**: 用户选中包含命令标签的文本，按快捷键 `Cmd+B Cmd+B`
2. **命令解析**: bbCommand 解析选中文本，提取命令类型和参数，构建 Bquest 对象
3. **核心分发**: BB 控制器根据命令类型分发到对应的处理器
4. **AI 处理**: 各处理器通过 aiProxy 调用 AI 服务，生成结果
5. **文本替换**: 将 AI 生成的结果替换原始选中文本
6. **错误处理**: 任何环节的错误都通过 ErrorHandler 统一处理和提示

## 支持的命令类型

| 命令 | 标签格式 | 功能描述 |
|------|----------|----------|
| NORMAL | `<bb:task>` | 通用 AI 代理模式 |
| EXPAND | `<bb-expd:requirements>` | 扩展文本内容 |
| IMPROVE | `<bb-impv:focus>` | 改进文本质量 |
| TRANSLATE | `<bb-tslt:target_lang>` | 翻译到指定语言 |
| TLDR | `<bb-tldr:style>` | 生成摘要 |
| KEYWORD | `<bb-kwd:focus>` | 提取关键词 |
| MERMAID | `<bb-mmd:description>` | 生成 Mermaid 图表 |
| TAG | `<bb-tag>` | 添加 BlogBuddy 标签 |

## 开发注意事项

### 配置管理
- 所有配置通过 ConfigService 统一管理
- 配置项定义在 ConfigKey 枚举中
- 配置变更会触发 ConfigWatcher，自动更新相关服务

### 错误处理
- 使用统一的 AppError 类型处理各种错误
- ErrorHandler 提供用户友好的错误提示
- 网络错误、配置错误、解析错误等都有专门的处理逻辑

### AI 接口管理
- aiProxy 单例管理 OpenAI 客户端
- 支持使用统计和调试信息
- 自动处理配置更新和客户端重新初始化

### 并发控制
- DocumentLock 确保同一文档不会被并发处理
- 防止用户快速连续触发命令导致的问题

### 类型安全
- 大量使用 TypeScript 类型定义
- 接口定义清晰（Bquest、Bsponse 等）
- 枚举类型确保命令处理的类型安全

## 构建和开发

### 开发环境
```bash
# 安装依赖
npm install

# 监听模式开发
npm run watch

# 类型检查
npm run check-types

# 代码检查
npm run lint

# 运行测试
npm run test
```

### 生产构建
```bash
# 构建生产版本
npm run package
```

### 扩展测试
- 在 VS Code 中按 F5 启动扩展开发主机
- 在新窗口中测试扩展功能
- 使用测试 Markdown 文件验证各种命令

## 扩展功能时的建议

1. **添加新命令**: 在 BBCmd 枚举中定义，在 core/ 目录添加处理器，在 bb.ts 中添加分发逻辑
2. **修改 AI 处理**: 主要在各功能模块中修改提示词和后处理逻辑
3. **添加配置项**: 在 package.json 的 configuration 部分定义，在 ConfigKey 枚举中添加
4. **错误处理**: 使用 AppError 和 ErrorHandler 确保一致的用户体验

## 依赖说明

### 主要依赖
- **openai**: AI 接口客户端
- **vscode**: VS Code 扩展 API

### 开发依赖
- **typescript**: 类型检查和编译
- **esbuild**: 快速构建工具
- **eslint**: 代码质量检查
- **@vscode/test-cli**: 扩展测试框架