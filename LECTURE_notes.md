---
### 一、Oh My Pi智能体工具介绍与安装准备
会议首先介绍了本次辅导课使用的核心工具Oh My Pi（OMP），并明确了其适用场景与安装前置条件。
#### 1. 工具定位与适用场景
- **轻量化辅助学习工具**：OMP相比大厂通用大模型更为轻量，适合学生日常辅助学习、编程及封装到软件项目中。
- **本地运行与跨平台支持**：该工具可安装在本地电脑，支持Windows（PowerShell）与macOS（Terminal）等操作系统。
#### 2. 安装前置条件
- **需配置DeepSeek API Key**：用户需在DeepSeek官网开通付费账号并获取API Key，以便本地智能体调用大模型进行推理。
- **推荐模型配置**：在配置智能体时，推荐使用DeepSeek模型，且日常辅助学习使用DeepSeek Flash版本即可满足需求。
### 二、数学可视化工具方案调研与收敛
针对中学数学概念的可视化需求，会议演示了如何利用大模型进行技术选型，并最终生成智能体开发提示词。
#### 1. 初始调研与方案收敛策略
- **明确3D可视化需求**：初始提问涵盖了2D与3D可视化框架，经评估后决定聚焦于3D方向，并明确偏好Three.js及类似3Blue1Brown的动画风格。
- **通过追问收敛方案**：面对大模型给出的庞杂选项，通过进一步提问锁定具体技术栈，最终确定了包含Three.js与VectorPlay等组件的可视化方案。
#### 2. 生成开发提示词
- **输出完整项目架构**：大模型最终生成的提示词包含了完整的项目结构、依赖库及开发要求，可直接交由OMP智能体执行构建。
### 三、智能体构建与可视化演示
会议将生成的提示词输入OMP，由其自动生成了本地Web服务，并成功演示了数学概念的可视化效果。
#### 1. 自动化代码构建
- **自动安装依赖并编写代码**：OMP智能体在接收到提示词后，自动安装所需依赖库，并在本地目录中编写构建可视化演示工具。
- **生成本地Web服务**：代码构建完成后，智能体生成了一个本地服务器，用户可通过浏览器访问并查看生成的可视化内容。
#### 2. 三角函数可视化演示
- **成功生成动态演示**：会议现场成功演示了三角函数的动态可视化效果，该演示支持鼠标拖动交互，直观展示了数学概念。
### 四、工具应用场景与扩展探讨
会议最后探讨了该可视化工具在学科辅导及日常软件工程中的实际应用价值。
#### 1. 学科辅导应用
- **辅助理解抽象概念**：该工具可通过生成可视化动画，帮助中小学生直观理解分数乘法、物理机械原理及核裂变等抽象概念。
- **生成定制化演示**：家长或学生只需在智能体中输入具体需求，即可快速生成针对性的学科概念演示。
#### 2. 日常软件工程应用
- **辅助文章与PPT生成**：该智能体工作流还可用于辅助撰写文章并自动生成包含核心概念朗读功能的演示文稿。
- **低成本运行**：整个演示过程的模型推理成本极低，实际花费不到10元人民币。
---
### 五、待办事项
- 清理电脑内存与磁盘空间，卸载不常用软件。 @Logan
- 通过微信发送想要可视化的几何与代数数学概念关键词。 @Logan
- 录制并整理本次辅导课的视频，将链接发送给参会人员。 @Chance
- 统一整理OMP工具链的上手步骤，并发送给参会人员。 @Chance
- 将生成的 VizMaster 三角函数可视化工具及提示词分享给参会家长与学生。 @Chance
- 后续搭建用于辅导英语阅读朗读的小工具。 @Chance
---
### 六、附录：VizMaster 工具链与软件清单（BOM）
本工具正式命名为 **VizMaster**：面向中学数学概念的交互式可视化工具链。2D 场景由 Elucim 驱动（逐帧动画，可拖动播放进度条），3D 场景由 Three.js 与 VectorPlay 驱动（可鼠标拖动旋转）。以下为构建与运行 VizMaster 所依赖的关键软件及其已验证版本。
#### 1. 运行时与工具链
| 组件 | 版本 | 用途 |
| --- | --- | --- |
| Node.js | 22.22.2 | Vite 开发服务器与生产构建 |
| npm | 11.15.0 | 依赖安装与锁定（package-lock.json） |
| Bun | 1.4.2 | 运行 OMP 自定义工具与工具链自检（OMP SDK 要求 Bun ≥ 1.3.14） |
| Git | 2.54.0 | 版本管理 |
| 操作系统 | macOS 15.7.7（Apple Silicon / arm64） | 本次构建与验证环境 |
#### 2. 智能体侧（Oh My Pi）
| 组件 | 版本 | 用途 |
| --- | --- | --- |
| Oh My Pi（OMP） | 18.10.3 | 本地智能体：按提示词生成并维护 VizMaster 代码 |
| 推理模型 | deepseek/deepseek-flash | 日常辅助学习推理（需 DeepSeek 官方 API Key） |
| @oh-my-pi/pi-coding-agent | 18.10.3 | OMP SDK：自定义工具契约（CustomToolFactory）与工具加载器，仅开发依赖 |
#### 3. VizMaster 第三方依赖
| 依赖 | 版本 | 用途 |
| --- | --- | --- |
| React / React DOM | 19.3.0 | 界面运行时 |
| TypeScript | 7.0.2 | 全量类型检查（tsc --noEmit） |
| Vite | 8.3.4 | 开发服务器与打包 |
| @vitejs/plugin-react | 6.1.2 | React 编译支持 |
| @elucim/core | 0.24.0 | 2D 动画场景：Player、Axes、FunctionPlot、Vector、Matrix、LaTeX 等 |
| three | 0.180.0 | 3D 渲染内核（OrbitControls、CSS2DRenderer） |
| vectorplay | 1.3.3 | 3D 向量可视化：MainFrame 与 plotSum / plotDifference / plotCross / plotScaled |
| katex | 0.16.47 | LaTeX 数学排版（Elucim LaTeX 组件的渲染依赖） |
类型声明包：@types/react 19.3.0、@types/react-dom 19.3.0、@types/three 0.186.0。vectorplay 未内置类型声明，VizMaster 自带手写声明 src/types/vectorplay.d.ts。
#### 4. VizMaster 自研模块
| 模块 | 作用 |
| --- | --- |
| src/tutorials/UnitCircle.tsx、QuadraticFunctions.tsx、Vectors3D.tsx、SolidGeometry.tsx | 四个内置教程场景（单位圆、二次函数、3D 向量、正四面体） |
| src/lib/plot.ts、theme.ts、scene-label.ts、vectorplay-scene.ts、tutorial.ts | 坐标布局、主题色、3D 标签、VectorPlay 生命周期适配、教程契约 |
| src/tools/math-renderer.ts | 三个 OMP 自定义工具：renderFunctionPlot、renderVectorScene、renderUnitCircleTutorial |
| scripts/tools-smoke.ts | 工具链自检：发现 → 加载 → 参数校验 → 代码生成，共 17 项检查（npm run tools:smoke） |
#### 5. 验证基线
- `npm run typecheck`（tsc --noEmit）无错误；`npm run build` 通过。
- 四个教程在 Chromium 中实测：页面错误 0、控制台错误与警告 0；教程切换后 WebGL 上下文与动画循环不泄漏。
- 依赖版本可由 package.json 与 package-lock.json 完整复现。
