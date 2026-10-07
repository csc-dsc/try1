# GOD · NULL 网站总结与交接

更新：2026-10-07。适用仓库：`D:\Github\try1`。这是当前实现和发布状态的入口；[REBUILD_HANDOFF.md](./REBUILD_HANDOFF.md) 记录 2026-09-30 阶段的研究与素材来源，不能把其中的旧 HEAD、未上线状态和“模型尚未接入”等结论当成现状。

## 1. 先看当前事实

- 这是**静态多页站点 + 局部 Vue 2/Three.js/Matter.js 场景**，不是 Vue Router 单页站。保留旧 `.html` URL 与文章锚点。
- 2026-10-07 按用户最新命名统一：完整昵称为 `GOD · NULL`，视觉标识为 `G//N`，缩写为 `GN`。导航、页脚、加载标记、文章设备、教程署名与历史页显示昵称沿用此命名；GitHub 用户名及现有站点地址保持 `csc-dsc` / `try1`。旧研究记录、分支名、包名和存储键属于既有内部标识，不能据此恢复旧站名。
- 源码远端：`hello-web` 与 `codex/null-garden-phase-1` 保持同步，当前工作目录在后者；用 `git ls-remote origin` 查询最新提交。本机的 `hello-web` 分支仍停在 `c4dd86b`，不要把这个本地分支当作最新源码。
- 构建发布远端：`gh-pages` 保存最新 `dist/` 成品。GitHub Pages 配置为 legacy 模式，从 `gh-pages /` 发布。线上地址：[csc-dsc.github.io/try1](https://csc-dsc.github.io/try1/)。最新发布提交及构建状态用 `gh api repos/csc-dsc/try1/pages/builds/latest` 核对，历史复盘里的提交号不作为当前状态。
- `dist/` 是 Vite 生成物，在源码分支被 `.gitignore` 忽略；`node_modules/` 也被忽略。当前**没有** GitHub Actions 自动构建/发布流程。只推送 `hello-web` 不会更新线上，必须重新构建并更新 `gh-pages`。
- 本机依赖先前已安装。未经用户批准，不运行 `npm install`、`npm ci`、`pip install` 或安装其它软件；不要为了“让 CI 自动化”擅自加安装步骤。先读用户提供的 AGENTS.md 操作约束。
- `http://127.0.0.1:5174/try1/` 曾用于 `vite preview`，但 2026-10-06 检查时该端口**没有**运行服务。不要把历史预览地址当作当前在线服务。
- `history/index.html` 保留公开可读，只有 `history/about.html` 使用密文档案入口；具体线上版本以 `gh-pages` 最新构建核对。两页旧版明文曾在公开 Git 提交中出现，前端门禁不能撤回旧提交、缓存或已下载的副本。

### 历史关于我的密文门禁

- `history/index.html` 直接展示已整理文案的历史首页，不加载门禁，也不再发布 `vault-index.json`。只有 `history/about.html` 需要独立随机口令和本机 `about.gnkey` 文件。公开目录包含该页的入口脚本及 AES-256-GCM 密文；口令、密钥文件、可读原文和持有者指南位于仓库外的 `D:\AI\site-private\try1\history`，不得加入 Git 或 `dist/`。停用的首页凭据仍留在本机私有目录，不参与封装。不要在日志、对话或提交信息中输出口令。
- `npm run archive:seal` 仅重封装历史关于我；`npm run build`、`npm run check:archives` 检查构建结果。公开记录不包含可单独验证口令或密钥文件的摘要，解封必须同时提供两者。解密代码在浏览器运行，这只是保护**新密文**，不是服务器身份认证。
- 原公开内容无法因替换当前文件而变为秘密。即使另行决定重写公开源码分支和 `gh-pages` 历史，也不能撤销他人克隆、搜索引擎或归档的旧副本。若目标是对新内容实施真正的访问控制，需要迁到具有服务端鉴权的托管，并确保内容从未先公开；不要在普通发布流程中强推或清理历史。

## 2. 用户提示词与已定设计方向

下表归纳多轮反馈的最终意图，而非逐字重复每条提示。用户已多次认可首页、关于我、夜间和紫色模式；后续修改应针对具体缺陷，不要重新设计已接受的整页。

| 范围 | 用户反复强调的要求 | 当前实现入口与边界 |
| --- | --- | --- |
| 整站 | 用层次、遮挡、滚动桥接和有反馈的动效表达安全研究者气质；避免单调矩形卡片、重复悬停、巨大僵硬标题。 | `index.css`、`visual-system.css/js`、各页场景 CSS/JS。导航尺寸与间距统一；深色、日间、紫色模式共存。 |
| 首页 | 保留主要文案；右上六件镂空硬件环绕，中心是 `spider-x86`，不是个人头像。作品与文章入口要有不同动效。 | `index.html`、`home-work.css`、`home-notes.css/js`。蝴蝶刀是自托管 3D，不要改回 Sketchfab iframe 或可点击的模型外链。当前介绍段文字左、模型独立画布右；刀具缩小且不裁切，窄屏转到文字后。 |
| 关于我 | 人像照片/线稿有剥离、碎裂和恢复感；头像只放个人页。技术段标题为“做过的事”，删去熟练度说明。原则段为“让理解经得起验证”，按观察、校验、沉淀、深耕排成编号条目。末段“屏幕之外／也要有风”左右各四字竖排，介绍与十个兴趣标签夹在中间，吉他保留右侧原位。 | `personal-instruction.html`、`profile-sections.css`、`visual-system.css/js`、`src/ambient/`。用户接受现有总体方向，不要把旧头像塞回首页。 |
| 平台 | 大标题与 1–6 平台入口之间放眼睛、心脏和信号场景，暗底统一。眼睛只要可见就跟随鼠标，距离影响瞳孔靠边程度；自然眨眼；点击后疼痛/警告，三次升级、五次进入全局血色序列。心电图由左端生成并向右流，悬浮渐进加速，经高密峰值逐步变平，移开后连续恢复。 | `platforms.html`、`platforms-scene.css/js`、`platforms-eye-events.css/js`。日间模式点击眼睛的圆角焦点框已改为轮廓发光。不要重写已通过测试的波形运输逻辑。 |
| 文章/教程 | 文章入口做成显示器、键盘、主机；点击发生不同入侵转场，不靠整页滚动翻段。教程需要可读性，尤其汇编代码的文字/背景对比。 | `articles.html`、`articles-scene.css/js`、`tutorial-visual.css`、三篇教程 HTML。旧内容和锚点应保留。 |
| 其他/历史 | 档案轨迹随滚动到底且在头像下层；头像光标点击可左右切换，不因悬停自动移动，环状光晕完整。Miku 项目视觉拼合不能在中缝断开。 | `other.html`、`other-archive.css/js`、`home-work.css`。`history/` 是历史快照，不按新版排版批量重写。 |
| Miku | 画廊图片按原比例完整预览，标题叫“画廊”；三首歌入口重构。首页题字、ARCHIVE 与动效要更流动，保留原文案，末图换为其它初音图。 | `miku-theme.html/css/js`、`image/miku/`。画廊与 Hero 原有分层渐变不要被共享样式覆盖。 |
| 字体与主题 | H1/H2 多用行楷/楷体回退，正文仿宋/宋体，缓慢流动的渐变、柔和阴影与信息值分色；日间模式必须与暗色/紫色不同且保持对比度。紫色偏熏衣紫、克莱因蓝只作少量过渡，不要工业蓝。 | `type-system.css`、`prism-theme.css`、`light-theme.css`。代码、终端和紧凑 UI 保持等宽字体；减少动态设置要受尊重。 |
| 导航 | 首页、关于我、友链才有自动浏览：入页默认 1 档，按钮选择慢/中/快/较快；手动滚动/按键取消。页脚 `TOP ↑` 要返回当前页顶端。 | `site-header.css`、`auto-browse.js`、`visual-system.js`。移动端浏览器被动修正滚动位置不应中断自动浏览；实际到达页面底部且布局短暂稳定后再停。`TOP` 不能只依赖指向固定导航栏的 `#top`。 |

## 3. 代码与资源地图

| 位置 | 作用 |
| --- | --- |
| `index.html`、`personal-instruction.html`、`other.html`、`hobby-lab.html` | Vite 多页入口，构建时处理模块依赖与 Vue 单文件组件。`hobby-lab.html` 是独立预览，不代替正式页面的模型布局。 |
| `platforms.html`、`articles.html`、`links.html`、`miku-theme.html`、三篇教程、`history/` | 旧式 HTML 页面，`vite.config.js` 的复制插件原样带入 `dist/`；不要无意让 Vite 解析巨大的旧教程 HTML。 |
| `visual-system.css/js`、`site-header.css`、`type-system.css`、`light-theme.css`、`prism-theme.css` | 共享视觉、页头、字体和主题。Lottie 加载器只在会话首次进入时按需载入，最多短暂遮挡，不等待全页图片与字体；离场后销毁动画。样式加载顺序、主题专用选择器和缓存版本号会影响结果。 |
| `profile-sections.css` | 仅关于我页面的原则条目与末段竖排题字样式；经 Vite 编译，保留既有外层网格和吉他槽位。 |
| `responsive.css` | 当前页面与历史页的移动端适配；小屏保留站名、页脚与 Miku 作者信息，处理长文本、代码/表格/图解的局部滚动、短屏菜单和模型分离。已加入旧式 CSS 压缩清单，目前共有 22 个 JS/CSS 文件。 |
| `prism-mode.js`、`site-header.css` 的 `.theme-cycle` | 七个主页面只用一个主题入口：普通点击展开 112px 宽的紧凑下拉菜单，入口不显示小箭头，直接选择日间、夜间、幻彩，选择后收起并显示当前项勾选；按住 Alt 或 Ctrl 点击入口仍反向走一步。主题入口不保留 title 悬停提示。太阳、月牙、渐变圆对应当前状态，支持方向键、Escape、外点关闭，并保留缓存偏好和 Miku 旧模式兼容。`index.js` 与 `miku-theme.js` 不再单独绑定明暗切换。 |
| `src/ambient/main.js`、`InlineObject.vue`、`inline-object.css` | IntersectionObserver 按需挂载首页蝴蝶刀、个人页吉他和其他页双截棍。离屏或浏览器隐藏时暂停渲染。 |
| `src/hobby/ModelScene.js`、`NunchakuRig.js`、`HobbyStage.vue` | Three 场景、Matter 双截棍约束、独立器材预览。`ModelScene` 中的 `import.meta.env.BASE_URL` 必须经 Vite 构建，不能把源码直接给浏览器执行。 |
| `public/graphics/`、`public/models/`、`public/motion/`、`public/vendor/` | Vite 会把 `public/` **内容**复制到 `dist/` 根目录。页面请求的是 `/try1/graphics/...`、`/try1/models/...` 等，不含 `/public/`。 |
| `image/` | 原本就在源码根目录的头像、Miku 画廊等图片；由构建处理或复制。与 `public/` 路径问题分开判断。 |
| `tools/check-*.mjs` | 主题对比度、平台眼睛/ECG、自动浏览、模型结构/取景的自动检查。它们不能代替真实浏览器交互验收。 |

三件自托管模型来自带署名要求的 CC BY 4.0 下载包，保留 `license.txt`、来源及页面署名。原包与哈希在 `D:\Github\获奖网页\try1重构规划\assets\source-models\`；旧 [public/models/README.md](./public/models/README.md) 仍保留早期“首页尚未接入”的叙述，**不能据此判断当前运行时状态**。更早的设计研究、拒绝过的素材候选及许可证边界见 [REBUILD_HANDOFF.md](./REBUILD_HANDOFF.md)。

## 4. 构建和发布到底怎样工作

```text
源码分支 hello-web / codex/null-garden-phase-1
  └─ npm run build (= vite build，使用已安装的依赖)
       ├─ 编译 Vue/Three 的模块入口到 dist/assets/
       ├─ 处理 HTML/CSS/图片引用并使用 base: '/try1/'
       ├─ 将 22 个旧式 JS/CSS 文件逐个交给 esbuild 压缩，保留原 URL
       └─ 复制 public/* 到 dist/ 根目录
            └─ 将 dist/ 的内容提交到 gh-pages 分支根目录
                 └─ GitHub Pages legacy 模式从 gh-pages / 提供静态文件
```

- `npm run dev` 是开发服务器，按请求即时转换源码；`npm run preview` **只展示已有的 `dist/`**，不会自行执行构建。Vite 配置的 `outDir` 是 `dist`，即 distribution（发布成品）。
- 2026-10-07 已加入统一代码压缩：Vite 模块及复制清单里的 22 个 JS/CSS 文件都使用现有 esbuild；逐文件处理保留传统脚本的全局绑定、中文和许可证注释，生产 sourcemap 关闭。HTML、图片和模型继续原样保留，可读源码不被覆盖；仅历史关于我使用上述密文门禁。此次 22 个文件从 257,910 字节降至 204,608 字节（减少 20.7%）；代码压缩本身不是加密。
- 构建后运行 `npm run check:build`，复用平台、自动浏览与主题菜单的 24 项测试来执行 `dist/` 中的压缩脚本；源码测试仍通过原有命令执行。发布时按既有流程将压缩后的 `dist/` 提交到 `gh-pages`，并核对 Pages 构建状态与实际文件内容。
- `.gitignore` 中 `/dist/` 只阻止在源码分支误提交生成目录，不删除本地文件，也不禁止把 `dist/` 的**内容**另行提交到发布分支。
- `public/.nojekyll` 会进入 `dist/.nojekyll`。保留它，否则 Pages 的 Jekyll 规则可能忽略 `_plugin-vue2_normalizer-...js` 这类以下划线开头的构建文件。
- 源码分支负责可维护性，`gh-pages` 只存生成物。当前是**手动部署**：每次改动源码，先测试并构建，再更新 `gh-pages`，最后核对 Pages 最新构建提交和线上 URL。推送 `hello-web` 成功不等于站点已更新。
- 不要把本地旧 `hello-web` 分支直接推上去覆盖远端；先核对 `git status`、远端提交和快进关系。也不要把 `dist/` 直接混进源码分支或新增 ZIP 快照。

## 5. 这次线上图片/模型故障复盘

**症状：**本地 `vite preview` 正常，最初把源码推到 `hello-web` 后，线上蜘蛛图、六个硬件图标、关于我头像线稿/Ghidra 图缺失；Lottie 不加载，三件 3D 模型不出现。头像照片和 Miku 画廊中位于根目录 `image/` 的图片可以访问。

**证据：**旧线上 14 个 HTML 与本地源码一致，说明不是漏推或 CDN 旧页。扩展核对的 58 个资源 URL 中有 17 个 404，全部在仓库 `public/` 内而不在源码根目录；例如旧 `/try1/graphics/avatar-lineart.svg` 是 404，而 `/try1/public/graphics/avatar-lineart.svg` 是 200。旧在线浏览器还直接报 `Failed to resolve module specifier 'vue'`。GitHub Pages 原设置从 `hello-web /` 发布；`dist/` 被忽略，没有上传。

**根因：**Vite 会把 `public/graphics/foo.svg` 映射到 `/try1/graphics/foo.svg`，并把 `import('vue')`、`.vue`、`import.meta.env.BASE_URL` 编译为浏览器可运行的 JS。Pages 从源码根目录发布时既不执行 Vite，也不做 `public/` 映射。只改图片路径无法解决 Vue/Three 的未编译问题。

**修复：**把 `hobby-lab.html` 加入 Vite 输入，修复其相对模块路径及 `stage.css` 的悬空选择器；加入 `.nojekyll`；构建后将 `dist/` 内容发布到独立 `gh-pages` 分支，把 Pages 来源切到该分支并请求构建。`hello-web` 源码未被构建产物覆盖。

**当次验收（历史记录）：**Pages 构建指向 `4bb012d` 且为 `built`；线上首页改为加载 `/try1/assets/index-...js`，不再加载原始 `src/ambient/main.js`。15 个 HTML 与 `dist/` 一致；100 个发布文件均可访问（一次连接中断单独重试为 200）。现有 Edge 中蜘蛛图、关于我线稿/照片/Ghidra 图均成功解码，Lottie 已加载，蝴蝶刀和双截棍场景达到 `is-ready`。吉他在后台 Edge 中未做实际动画验收，不能因懒挂载未发生就判为故障。

## 6. 其它值得记住的故障与做法

| 现象 | 真正原因 | 下次先检查 |
| --- | --- | --- |
| 双截棍“鼠标拖不动” | 透明的 `.directory-hero .section-shell` 层级高于画布，画布中心命中的是容器而非 `canvas`。 | 在现有 Edge 用 `elementFromPoint()` 检查画布多个位置；不要只看模型物理测试。修复位于 `other-archive.css` 的指针透传。 |
| 页脚 `TOP ↑` 点击无反应 | `#top` 指向固定导航栏；它永远在视口顶端，地址已有 `#top` 时重复点击也不会滚动。 | `visual-system.js` 显式滚到 0；`auto-browse.js` 对页脚点击停止自动浏览。逐页从底部重复点击验证 `scrollY=0`。 |
| 日间点击眼睛出现圆角矩形 | SVG 焦点 `outline` 画在元素盒子上，而非眼形轮廓。 | `platforms-eye-events.css` 在日间模式移除盒子外框，用眼眶加粗/发光保留键盘焦点提示。 |
| 页面字体或代码看不清 | 只看单一主题或只检查文字颜色，没有把背景、代码块和渐变停靠点一起验收。 | `type-system.css` 的渐变依赖所在表面的 `currentColor`；教程浅底另有深色点缀。运行 `check:theme`，再在暗/日间/紫色逐页检查。 |
| 模型尺寸、布局测试通过但视觉仍错误 | 外层槽位坐标不等于放大、平移、裁切后的 `canvas` 可见范围；Vue 挂载还会替换占位节点。 | 同时检查挂载前后网格位置、画布 `getBoundingClientRect()`、`clip-path` 和模型 `is-ready`。不要只测占位盒。 |
| 浏览器后台模型静止 | `IntersectionObserver` 懒挂载，`document.hidden` 时停止 `requestAnimationFrame`，这是节能逻辑。 | 把“未挂载/已暂停”与资源 404、模块错误区分；后台 DOM 检查不能宣称已逐帧验收。 |
| 手机自动浏览提前停止 | 浏览器地址栏与布局变化可被误认成手动向上滚动，旧逻辑抵达当时的高度便立即停止。 | `auto-browse.js` 只由明确输入取消，按实际滚动位置判断底部，并等待布局短暂稳定；`check:navigation` 覆盖视口修正和延迟增长。 |
| 幻彩模式手机眼睛周围浅线 | SVG 焦点外框与移动端浅色轨道在暗底上显白。 | `platforms-eye-events.css` 用眼眶发光表示键盘焦点，移动端幻彩轨道改深色；后台桌面 Edge 不能代替手机真机视觉验收。 |

## 7. 接手后的执行顺序

1. 先读本文件、用户/仓库 AGENTS.md，再看 `git status`、`git branch -vv` 和 `gh api repos/csc-dsc/try1/pages`。以当前代码与远端提交为准，不从 9 月旧 handoff 推断现状。
2. 用现有框架做小范围改动：共享视觉在共享 CSS/JS，眼睛/心脏在平台模块，档案轨迹在 `other-archive.*`，Miku 在 `miku-theme.*`，模型在 `src/ambient/` 与 `src/hobby/`。不要重造已有的眼睛、ECG、画廊、自动浏览或 3D 场景。
3. 不安装依赖的前提下运行 `npm run check:models`、`npm run check:platforms`、`npm run check:navigation`、`npm run check:theme`、`npm run build`、`npm run check:build`、`git diff --check`。构建的非 module 旧脚本和 Three chunk >500 KB 提示曾存在；要区分 warning 与失败，但不能忽略新的 CSS 语法警告。
4. 浏览器任务遵守用户的硬规则：只通过 `D:\MCP_Servers\browser-harness-conda\Scripts\browser-harness.exe` 附着现有 Edge，不启动新 Edge/标签、Playwright 或 CDP。该 skill 不截图；用 DOM、计算样式、资源状态、交互命中和 canvas 状态核对。修改之后至少检查桌面与可获得的窄屏，未测到的视口如实写明。
5. 发布前确认 `dist/` 中所有 HTML、`graphics/`、`models/`、`motion/`、`vendor/` 和 `.nojekyll`，并确认构建版入口是 `/try1/assets/...`。源码提交与发布提交是两件事；部署后查 Pages `source`、最近构建的 commit、实际页面与关键资源 HTTP 200，不能只看 `git push` 成功。
6. 保留模型许可证、署名和现有用户改动；不运行破坏性的 Git 重置，不擅自删除旧快照，也不新建 ZIP 备份。部署使用的本任务临时目录 `D:\AI\tmp\try1-pages-deploy` 在 2026-10-06 仍存在（约 16.2 MB，非线上依赖），递归清理命令曾被工具策略拒绝；不要把它当作源仓库或再次提交，后续清理应遵守本机路径验证与工具权限规则。

## 8. 尚未自动化或未完全验收

- 2026-10-07 关于我文案与排版的新修改已完成本地预览；用户先要求本地检查，随后明确指示“直接上传吧”，已授权将这批改动发布。当前可用预览为 `http://127.0.0.1:5174/try1/personal-instruction.html`，服务运行状态仍需核对。320/375/768/1024/1280 宽度和三种主题已做 DOM 布局、分隔与文字对比度检查；吉他槽位与修改前相同，加载后的桌面画布宽 343.75px、高约 251.2px，外层网格内偏移约为 x=836.22px、y=95.99px。模型、声音、键盘与拨弦代码未改。后台浏览器的动画状态不作为可见逐帧验收。

- 2026-10-07 同批本地修改新增：透明 `public/graphics/ghidra.png` 替代日间模式下有黑底的 JPEG，来源为本机 Ghidra 官方发行包，同目录保留许可证。13 个页面已在 320/375/430/768/1024/1440 宽度检查，正文数量一致且没有横向溢出；菜单、文章四个状态、画廊与教程目录/局部滚动已检查。七个主页面的单按钮三态主题另在 320×480、375×812、844×390、1440×900 检查，切换和短屏文字裁切检查通过。这里是 Edge 中的布局与交互验证，不能替代手机真机触摸验收。用户已于 2026-10-07 明确授权上传这批改动，按既有源码分支与 `gh-pages` 流程发布。

- 2026-10-07 移动端加载优化：不再在九个页面静态加载 161 KB Lottie 脚本，只在首次显示加载器时请求，并在离场后销毁实例；最大固定遮挡从约 3.2 秒降至 1.1 秒，不等待全页图片和字体。Miku 首屏背景提前请求，隐藏的画廊预览图不再抢先下载；非首屏图片懒加载并异步解码。`miku-motion.gif` 保留作原素材，页面改用 291,906 字节的动画 WebP（原 GIF 1,383,886 字节），已验证浏览器解码与 14 帧差异。核心图片均自托管，但 GitHub Pages 在不同手机网络或代理线路上的延迟仍须真机观察；不要为每个页面额外复制一套 Lottie。

- **自动发布未配置。** 未来可在用户明确同意依赖安装/CI 步骤后建立 GitHub Actions，从源码构建并部署；此前每次仍需手动更新 `gh-pages`。
- 吉他在可见 Edge 中的声音、键盘与拨弦；移动端真实触摸、320/375/768 视口；减弱动态与长时间性能仍值得再验收。现有静态测试与 HTTP 200 不能代替这些交互测试。
- 旧研究文档及 `public/models/README.md` 有阶段性结论，不得按文件仍在磁盘就认为功能未接入，也不要重复下载、替换已经正式使用并有许可记录的模型和素材。
