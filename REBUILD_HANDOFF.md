# Null Garden / try1 重构交接（2026-09-30 历史记录）

> 当前实现、GitHub Pages 发布、故障复盘和接手顺序请先读 [CURRENT_SITE_HANDOFF.md](./CURRENT_SITE_HANDOFF.md)。本文件保留早期研究材料；下文的 HEAD、未提交/未上线状态和模型接入情况已过时。

更新：2026-09-30。给接手此项目的 AI/开发者阅读。**先读当前交接文档，再将本文件作为研究档案；研究档案中有多个历史阶段的结论，不一定代表当前实现。**

## 1. 当前事实与操作边界

- 工作仓库：`D:\Github\try1`；线上旧站：[csc-dsc.github.io/try1](https://csc-dsc.github.io/try1/)；参考站：[JIEJOE / home](https://www.jiejoe.com/home)。视觉研究及原始资源归档：`D:\Github\获奖网页\`。
- 当前分支：`codex/null-garden-phase-1`；HEAD 仍为 `c4dd86bfbec55c514f89f68ae0632e73be1e2f83`。**大量改动未提交、未推送、未部署；线上不能视为本地重构版。** 不要因为 GitHub 有旧版就清理或覆盖本地修改。
- 两份已校验、可回溯的旧快照：`D:\Github\获奖网页\try1重构规划\snapshots\20260930-115227-pre-rebuild\` 和 `...\20260930-125115-pre-integration\`。后者是兴趣模型集成前的快照，**不是本交接时的最新工作树快照**。快照各有 `README.md`、`snapshot.json`、`worktree.zip`、`tracked.patch` 和逐文件哈希。
- 用户在开始重构前已有三篇教程的未提交修改，以及 `next2.html` 的删除。这些是用户原有工作，必须保留。其他未提交文件也不要一概假设为可撤销的生成物；先看 `git status` 和差异。
- 当前已安装的项目依赖在 `D:\Github\try1\node_modules`。未经用户明确同意，不运行 `npm install`、`pip install` 或任何安装程序，不改系统 PATH/注册表。`dist/`、`node_modules/` 被 `.gitignore` 忽略。
- 预览曾运行在 `http://127.0.0.1:5173/try1/`（Vite dev）和 `http://127.0.0.1:5174/try1/index.html`（Vite preview）；**端口需重新核对**。构建基路径是 `/try1/`。

## 2. 用户的最新设计决定（优先于旧方案）

1. **整体重构，而非旧版上不断添卡片。** 目标是借鉴获奖站的运动层次、遮挡、节奏与交互，不复制作者的人物、木马、电影帧、电话或整站源码。应保留自己的内容与身份表达，克制使用矩形块、直线分割、突兀的演示面板。
2. 首页现有主标题、副标题等主文案**不要改写**。部分终端打字、弹出/退回效果可以保留。早期 Observe / Reconstruct / Explain 三步模板化学习回路不再作为主体；“正在生长的实验”原文保留，但要完整居中、不拆字、不溢出。
3. 色彩沿用原站 GitHub 感的暗底、灰白及青/绿点缀，允许更精细的光影与层次；不要转成无关的获奖站品牌配色。首页右上角**六件镂空硬件图形的环绕运动已获明确认可，别改掉这部分**。最新决定：`spider-x86.png` 应固定在这条轨道的**正中间**；不是人物头像。它现已从个人页重复位置移到轨道中心。
4. 蝴蝶刀、双截棍、木吉他分别自然散落在不同页面或场景中，只呈现物件本身，不配中文说明、不设独立爱好展柜或模式/暂停控制面板。默认完整循环播放；拖动要灵敏、松手有反馈。吉他保留声音开关，并提供键盘按钮及 `1`–`6` 数字键拨弦。三者的大小、颜色、光照、阴影和取景要融入全站，不能以粗糙 Sketchfab iframe、视频或静态贴图替代。
5. 个人元素要有辨识度：魔方、单排轮滑鞋、Android 小人、Linux 企鹅、蝴蝶刀、木吉他、双截棍、山地自行车、篮球、羽毛球；技术元素可用 CPU、键盘、鼠标、螺丝刀、清灰气吹、焊剂/焊接工具、Ghidra/IDA/x64dbg 等。可以用简洁单/双色剪影、镂空线稿与合理阴影，不要随手塞实心矩形或无关素材。`D:\无聊\图片&视频\spider-x86.png` 与 `ghidra.jpg` 是用户给的原始线索，已复制工作副本到 `public/graphics/`。
6. 每个大标题之间不要只是平直分割线。用户举例：滚动出现碎镜揭示、屏幕被入侵后切换内容，以及不同的动态波浪或撕裂。现已在主要页面做第一版滚动桥接，但仍需审美和移动端验收；不要将“存在 CSS 形状”当作最终完成。
7. 明确喜欢 JIEJOE 的**眼球注视跟随**、跨板块浮层视差、上层图形/片段带加速、通过前景间隙看到下层文字、速度与文字填色联动。这些是完整空间关系与反馈，不是放几个孤立动图。鼠标光效粒子可以有，但必须受控、优化性能。
8. 导航和外链要有清楚的内容归属，不重复堆同一链接；没有确认的项目地址可留非链接状态。旧 `.html` 页面、文章锚点、返回/刷新语义必须保持。
9. 缺素材先继续查已有归档及公开资源。确实没有合适内容时列明缺口，不能拿无关图片糊弄、把静态 SVG 冒充成品动画，也不能宣称“全网找不到”。用户明确否决 `research-round-02/skills/android-version-0.json` 及同款 Android New Version 变体，**不得重新采用**；其余当时展示的候选可继续比较。

## 3. 当前代码是什么，不是什么

| 范围 | 当前实现 | 仍需处理 |
| --- | --- | --- |
| 首页 `index.html` + `visual-system.css/js` | 保留主文案；右上六件 `public/graphics/hardware.svg` 硬件线稿按鼠标/时间环绕；`public/graphics/spider-x86.png` 位于轨道中心；Lottie 方块首访加载；作品行悬停预览、部分扫描/滚动线、有限鼠标粒子 | 首屏以外的整体构图继续提高；眼球、真实魔方、前景缝隙露字/按住加速尚未完成 |
| 章节转场 | 首页、个人页、友链页有屏幕扫描、碎片、动态波形和撕裂桥；目录页通过 JS 加锯齿接缝。进度由 `visual-system.js:scrollScenes()` 驱动 | 当前是第一版形状/运动，非完整“黑客入侵屏幕”或真实镜面碎裂；需观察节奏、前后层遮挡、浅色主题与移动端 |
| 兴趣物件 | 首页介绍区蝴蝶刀、个人页末段木吉他、其他页双截棍，均在透明 Three.js 画布中按需挂载并自动循环。`src/ambient/` 是正式页面入口 | 实机取景/大小/材质与交互仍可细调；移动端触控和弱设备验收未完成。`hobby-lab.html`、`src/hobby/HobbyStage.vue` 是独立预览/旧控制版，不等于最终布局 |
| 双截棍 | `src/hobby/NunchakuRig.js` 用 Matter.js 做两柄短链约束，替换了原导出动作中棍体脱离链段的问题 | 继续人工检查形体准确、连接段可见、循环和拖动感觉；不能把原 glTF 的 10 条对象轨道误说成 10 套完整动作 |
| 吉他 | 六根可独立形变的弦、点击/拖动拨弦、可选合成音、键盘按钮及 `1`–`6` 支持在 `src/ambient/InlineObject.vue` 与 `src/hobby/ModelScene.js` | 声音/键盘只在当前物件可见且未编辑输入框时生效；应继续测实际音色和触控反馈 |
| 个人页 | 同一头像的照片/线稿扫描，技能矩阵及吉他；`spider-x86` 已不在技能标题里重复出现 | 自动派生线稿尚需美术精修；人物图不放回首页轨道中心 |
| 其他页面 | 目录页和旧教程继续使用原 `.html` 地址；原有教程内容保留；MIKU 页未被本轮替换 | 路由统一、重复链接检查、全页视觉回归仍需做 |

现在是**渐进式静态多页 + 局部 Vue/Three 组件**，不是已完成的 Vue Router 单页站。`vite.config.js` 只把首页、个人页和其他页交给 Vite 编译；其他旧 HTML/CSS/JS 通过插件原样复制到 `dist`，避免 Vite 解析旧教程 HTML 时出错。`src/ambient/main.js` 使用 IntersectionObserver 懒挂载三个物件；离屏/隐藏页暂停渲染，`ModelScene.js` 负责资源释放。`public/models/index.json` 中的 `motionStatus` 是原始资源研究记录，**没有随每次运行时接入同步更新**，不能只读它判断现在完全未播放。

依赖已经固定在 `package.json`：Vue 2.7.14、Vue Router 3.6.5、GSAP 3.11.5、Lenis 1.1.6、Lottie Web 5.10.2、Matter.js 0.19.0、Three.js 0.167.1、Vite 5.4.20。已安装不代表都进了正式站：Vue/Three/Matter/Lottie 已使用，GSAP 主要在独立爱好预览，Vue Router 与 Lenis 尚未成为正式导航/滚动运行时。不要为“用齐技术”而增加不必要复杂度。

## 4. 参考站、开源代码与可用资源

### 获奖参考站

- 原站：[JIEJOE / home](https://www.jiejoe.com/home)。恢复目录：`D:\Github\获奖网页\JIEJOE\`。先读 `README.md`、`docs/DESIGN_ANALYSIS.md`、`docs/REFACTOR_HANDOFF.md`、`RESOURCE_INDEX.md`；11 个恢复的源码文件在 `src/`，首页机制在 `src/views/home.vue`，资源 URL 映射在 `resource-index.json`。这里是 source map 恢复的**参考源码**，不是原作者可直接构建的完整仓库；缺失项见其 `verification.json`。不要复制个人肖像、电影帧、品牌素材。
- 已按原站首页定位的体验：`wel` 首屏、`about` 自介、`portrait` 扫描、`skills` Lottie、`idea` 物理、`spider_eye` 跟随、`works`、`video_title` 胶片加速、`videos` 悬停、`photos` 叠层、`contact` 悬挂物理。源码位置与机制请看 `D:\Github\获奖网页\try1重构规划\MOTION_STUDY.md` 和 `motion-patterns.json`，不要仅凭名字仿造。
- 额外开源动效参考：[Codrops OnScrollTypographyAnimations](https://github.com/codrops/OnScrollTypographyAnimations)（MIT）；[Musab-Hassan/musabhassan.com](https://github.com/Musab-Hassan/musabhassan.com)（MPL-2.0）。研究运动结构和分层，复用代码前核查许可边界与项目适配，不要直接把另一个站粘进来。

### 已取得的核心资产

| 对象 | 本机可直接查找的资源 | 来源/许可与真实状态 |
| --- | --- | --- |
| 三件兴趣 3D | 运行时文件 `public/models/{balisong,nunchaku,guitar}/`；原始 ZIP 与哈希 `D:\Github\获奖网页\try1重构规划\assets\source-models\` | [Balisong](https://sketchfab.com/3d-models/balisong-85f7e55c67974a3585eeed345fbbd972)、[Game Of Death Nunchaku](https://sketchfab.com/3d-models/game-of-death-nunchaku-059e31451a464c1ea969b5b3a58c36b1)、[SM Yamaha String Acoustic Guitar](https://sketchfab.com/3d-models/sm-yamaha-string-acoustic-guitar-instrument-38d4be70e4054a15afd77946b1a)。官方登录下载的 glTF + 原始格式；包内 CC BY 4.0，署名及校验看 `acquisition.json`。正式页用自托管模型，Sketchfab iframe 只作动作对照 |
| 真正可转层魔方 | `D:\Github\获奖网页\try1重构规划\research-round-02\rubik\source\` | [bsehovac/the-cube](https://github.com/bsehovac/the-cube)，固定提交/许可见 `research-round-02/RESULTS.md`。有选层、转层和 3x3 几何，**尚未接入正式首屏**；原源码自带旧 Three r95，不能直接混用 |
| Lottie 加载 | 正式运行时 `public/motion/loader-cube.json`；研究候选 `...\research-round-02\loaders\cube-3x3-1.json`、`cube-isometric-1.json` | [3x3 Cube Loader #2](https://lottiefiles.com/free-animation/3x3-cube-loader-2-3xOmkHzcPv) 与 [Isometric Tri-cube](https://lottiefiles.com/free-animation/isometric-tri-cube-loader-b6D8NBsjYY)，Lottie Simple License 记录见研究目录。当前为首次加载过场，尚未与真正可操作魔方衔接 |
| 山地自行车 | `...\research-round-02\mountain-bike\upstream\glTF-Binary\CarbonFrameBike.glb`；Draco 版同级 `glTF-Draco\`；结构报告 `structure-report.json` | [Khronos glTF-Sample-Models PR #357](https://github.com/KhronosGroup/glTF-Sample-Models/pull/357)，CC BY-SA 4.0。现成动画是分解/回装，不是骑行；**未接正式站** |
| 同图人物线稿 | `public/graphics/avatar-lineart.svg` 与 `image/avatar.jpg`；研究源/预览 `...\research-round-02\portrait\` | 从站内同一头像自动派生，已接双层扫描；边缘碎线仍待人工精修，不算最终人物绘制 |
| Android/Linux/轮滑/球类静态候选 | `D:\Github\获奖网页\try1重构规划\assets\` 的 `android-tabler.svg`、`linux-simple-icons.svg`、`delapouite-roller-skate.svg`、`delapouite-basketball-ball.svg`、`delapouite-shuttlecock.svg` 等 | [Tabler Icons](https://github.com/tabler/tabler-icons)、[Simple Icons](https://github.com/simple-icons/simple-icons)、[Game Icons](https://github.com/game-icons/icons)；确切作者/许可看 `sources/ASSET_SOURCES.md`。这些多数只是造型候选，未具备个人化分层动作 |
| 技能动画 | `...\research-round-02\skills\code-review.json`、`terminal-coding.json`、`backend-icon.json` 等 | 来源/许可和逐帧核验见 `research-round-02/RESULTS.md`、`sources/lottiefiles-final-candidates.json`。**Android New Version 两版已淘汰**，不能拿文件仍在磁盘当成可采用 |
| 技术符号 | `public/graphics/hardware.svg`、`spider-x86.png`、`ghidra.jpg` | 硬件六图已用于首页环绕，spider 最新放在中心；Ghidra 图在个人技能条。更多技术工具图可以继续按用户指定研究，但不要重复放无关标志 |

研究总入口是 `D:\Github\获奖网页\try1重构规划\README.md`、`REBUILD_PLAN.md`、`asset-manifest.json`、`research-round-02/RESULTS.md`。这些文件有**写作日期和阶段局限**：例如旧方案曾写三模型“尚未正式接入”、蝴蝶刀“渲染待做”、源包“401 取不到”等，均已被后续官方下载和当前代码覆盖。最新状态以本文件、当前仓库及 `assets/source-models/acquisition.json` 的证据交叉判断。

## 5. 未完成的整段体验，不要用占位动图冒充

- **眼球/企鹅眼睛**：方向映射、外层旋转缓动、内部眼珠/帧滞后与跨角度最短路径；可见注视感，不是图标跟在光标旁。原站机制见 `MOTION_STUDY.md`。
- **浮层与视差**：硬件或兴趣器材跨章节边缘，在前景移动，后层文字/纹理速度不同，有合理遮挡与阴影；不能只在原地上下浮动。首页轨道中心 spider 与六件环绕是当前已认可区域，后续不要用浮层把它盖住。
- **胶片/片段带**：真实的上层片段或剪影彼此留缝，缝内能看到下层描边/填色大字；按住持续加速，速度、显露、提示与松手恢复一体。需要自己的兴趣/作品帧，不能借 JIEJOE 的电影帧填充。素材不足要记录具体缺什么。
- **互动魔方**：应是真正能选层、转层和归位的 3x3，而非一个整体旋转方块。加载 Lottie 目前只负责过场。真实魔方要与首屏文字、硬件轨道协同，不互相挤压。
- **山地车/轮滑/Android/Linux/球类**：山地车优先“完整→拆解→局部查看→回装”，目前未在站点；轮滑鞋按单排轮结构做悬挂拖拽；Android/Linux 做简洁但准确的分件、碰撞与注视；篮球、羽毛球需符合各自物理特征。静态 SVG 有了不等于动画已完成。
- **页面转场**：现有 CSS 桥是第一版。继续检验扫描接管像“内容被改写”而非单纯亮线，碎片运动是否真正揭露下段主题，波形/撕裂的形状是否和滚动节奏匹配。不同段落应各有特点而非复制同一道边界。
- **结构与链接**：避免同一仓库在多个区域重复入口，Poetry Lab 未核对具体仓库时维持非链接；保留 `links.html#feishu` 和三篇教程现有锚点。后续迁移 Vue Router 时，GitHub Pages `/try1/` 基路径及旧 `.html` 地址兼容要先验证。

## 6. 接手后的推荐顺序与验收

1. 在当前工作树核对 `git status`，阅读 `index.html`、`visual-system.css/js`、`src/ambient/`、`src/hobby/ModelScene.js`、`vite.config.js`；不要按 9 月早期规划重建一个空项目。
2. 先看已有预览中的**整页**，而不只是单个动效。逐段检查尺寸、遮挡、文字和背景、过渡节奏、对象取景。用户目前明确满意的是右上硬件环绕；中心 spider 是最新要求，刚刚接入，需要继续让用户确认视觉比例。
3. 优先补 320/375/768/桌面真实视口验收、明暗主题、减少动态、键盘和触控。最近一次仅用现有 Edge 验证了桌面宽度（1908px）：中心图片加载、中心偏差 0px、六件环绕仍在、无横向溢出；浏览器隐藏时 `window.resizeTo` 不改变视口，故**不得声称移动端已验收**。
4. 再按第 5 节补整段空间体验，优先级由用户最新反馈决定。每个对象需核对进入、待机、交互、松手/结束、离屏与资源回收；性能上不同时启动三项 GLB、山地车和粒子层。
5. 每批运行 `npm run check:models`、`npm run build`、`node --check visual-system.js`、`git diff --check`。Vite 当前对非模块 `lottie_light.min.js`/`visual-system.js` 有提示，且 Three 场景 chunk 约 588 KB 提示超 500 KB；构建仍可通过，不要把 warning 误报为失败。构建产物 `dist/` 被忽略；**不要自行发布或推送**。

## 7. 浏览器与文件操作硬规则

用户要求控制当前已打开的 Edge 时，唯一允许的浏览器控制器是 `D:\MCP_Servers\browser-harness-conda\Scripts\browser-harness.exe`，经 stdin 送入命令，保留既有标签、Cookie 和登录态。不启动新 Edge，不开新标签/profile，不切换 Playwright、CDP、DevTools MCP，也不以端口是否开放推断不能附着。复杂脚本放 `D:\AI\tmp\<任务名>\`，完成后核对归属并清理；浏览器失败要报告 browser-harness 原始错误。该 skill 要求不截图，使用 DOM、计算样式与画布状态核对可验证项目。

本项目和归档里的资源可能有许可/署名要求，尤其 Sketchfab 模型的 CC BY 4.0、山地车 CC BY-SA 4.0、Game Icons 的 CC BY 3.0 和 Lottie Simple License；页面上的小 `©` 来源入口在 `src/ambient/InlineObject.vue`，不要为了去掉文字而删掉必要来源记录。不要下载执行未知安装器，不要把浏览器登录令牌、临时签名下载链接或用户私有资料写进仓库。
