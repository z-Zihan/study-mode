# 学习模式 Study Mode

浏览网页时，把**浏览器标签页上的标题**和**页面里的大标题**自动换成学习类标题。适用于 Chrome、Edge，也可在 Firefox 中临时使用。

**当前支持站点：知乎（zhihu.com）**

> 效果示例：打开一个知乎八卦问题，标签页和问题大标题显示的是「机器学习基础知识点梳理：偏差、方差与过拟合」，正文内容不受影响。

<!-- 截图占位：将截图放到 docs/screenshot.png 后取消注释 -->
<!-- ![截图](docs/screenshot.png) -->

---

## ✨ 使用说明

### 第一次安装

以下以 **Chrome** 为例，全程大约 2 分钟。

**第 1 步：下载安装包**

1. 打开下载页面：https://github.com/z-Zihan/study-mode/releases/tag/latest
2. 在页面下方的 **Assets** 区域，点击名为 **`study-mode-v版本号.zip`** 的文件（例如 `study-mode-v1.1.0.zip`）下载。
   - 不要点 **Source code (zip)** 或 **Source code (tar.gz)**，那是给开发者的。
   - 想要正式版本，可在全部版本列表中选择：https://github.com/z-Zihan/study-mode/releases

**第 2 步：解压**

1. 找到刚下载的 zip 文件（一般在「下载」文件夹里）。
2. 解压：
   - **macOS**：直接**双击** zip 文件，旁边会出现一个同名文件夹。
   - **Windows**：在 zip 文件上**右键** → 选择 **全部解压缩…** → 点 **解压缩**。
3. 把解压出来的文件夹移到一个**不会被误删**的位置（例如「文稿」或「文档」）。之后这个文件夹要一直保留，删掉它扩展就会失效。
4. 打开这个文件夹看一眼：里面应该**直接**能看到一个叫 `manifest.json` 的文件，以及 `src`、`icons` 等文件夹。

**第 3 步：打开扩展管理页**

1. 打开 Chrome，点击顶部的**地址栏**。
2. 输入或粘贴 `chrome://extensions`，按 **回车**。
   - 也可以通过菜单进入：右上角 **⋮** → **扩展程序** → **管理扩展程序**。

**第 4 步：打开「开发者模式」**

1. 在扩展管理页的**右上角**，找到 **开发者模式** 开关。
2. 点击把它**打开**（变成蓝色）。页面左上方会多出一排按钮。

**第 5 步：加载扩展**

1. 点击左上方的 **加载未打包的扩展程序** 按钮（旧版 Chrome 写作「加载已解压的扩展程序」，同一个按钮，不同版本翻译不同）。
2. 在弹出的选择窗口中，找到第 2 步解压出来的文件夹，选中**里面直接有 `manifest.json` 的那个文件夹**，然后点 **选择**（Windows 为 **选择文件夹**）。
   - ⚠️ 不要选 zip 文件本身，必须先解压。
   - ⚠️ 如果点进文件夹后发现里面还套着一层同名文件夹，要选**里面那层**（能直接看到 `manifest.json` 的那层）。

**第 6 步：确认安装成功**

1. 扩展管理页中出现一张名为 **学习模式 Study Mode** 的卡片，卡片右下角的开关是**打开**状态，就说明装好了。
2. 没有别的了——本扩展**没有弹窗、没有工具栏图标**，装上即自动生效。

> 💡 Chrome 可能在卡片上显示「错误」或「未知字段」之类的黄色提示，这是正常现象，不影响使用（见下方常见问题）。

#### Edge 用户

步骤与 Chrome 完全相同，只是第 3 步在地址栏输入 `edge://extensions`。「开发者模式」开关在页面**左侧栏**（窗口较窄时在左上角菜单里），打开后点 **加载解压缩的扩展**。

#### Firefox 用户

Firefox 只能「临时载入」，**关闭浏览器后会自动失效**，下次打开需要重新载入：

1. 在地址栏输入 `about:debugging#/runtime/this-firefox`，按 **回车**。
2. 点击 **临时载入附加组件…**。
3. 进入解压后的文件夹，选中里面的 **`manifest.json`** 文件，点 **打开**。

### 日常使用

- **装好即生效，什么都不用点。** 打开任意知乎问题页或文章页，标签页标题和页面大标题会自动变成学习类标题。
  - 如果装扩展前已经开着知乎页面，**刷新一下**那个页面即可。
- **想换一条标题？打开一个新页面就行。** 每打开一个新的知乎页面，都会随机换一条新标题。
- **同一个页面里标题保持不变**，不会闪烁，也不会自己轮换。
- **想暂时关闭？** 本扩展没有开关 UI。最简单的方式：在 `chrome://extensions` 的扩展卡片上暂时停用，用的时候再启用。刷新页面即恢复原标题。

### 升级版本

1. 按「第一次安装」的第 1、2 步，下载并解压新版本的 zip。
2. 把新解压出来的文件**全部复制**到原来的扩展文件夹里，遇到同名文件选择 **替换**。
   - ⚠️ 不要删除原来的文件夹，也不要换位置，否则扩展会失效。
3. 打开 `chrome://extensions`，在 **学习模式 Study Mode** 卡片上点 **刷新图标 ↻**（重新加载）。
4. 刷新已打开的知乎页面，新版本就生效了。

### 常见问题

**Q：装了之后标题没变？**
A：按顺序检查：
1. 确认当前打开的是知乎页面（网址里有 `zhihu.com`）；
2. 装好扩展后**刷新一次**知乎页面；
3. 打开 `chrome://extensions`，确认扩展卡片是**启用**状态；
4. 还不行的话，在扩展卡片上点 **刷新图标 ↻**（重新加载），再刷新知乎页面。

**Q：在知乎里点到另一个页面，标题没变？**
A：知乎有些页面切换不会整页刷新，扩展最迟约 1 秒内就会换上新标题，稍等一下即可；如果仍没变，刷新页面。

**Q：Chrome 提示「未知字段 browser_specific_settings」？**
A：这是给 Firefox 用的设置，Chrome 不认识所以会提示一下，**忽略即可**，不影响使用。

**Q：卸载后会留下痕迹吗？**
A：不会。扩展只在你自己电脑上替换显示的文字，卸载（在扩展卡片上点 **移除**）后就完全消失，不留任何数据。之后也可以放心删掉解压出来的文件夹。

**Q：会被知乎发现或封号吗？**
A：扩展不修改任何网络请求，也不改动知乎的任何数据，只改变你本地屏幕上显示的标题文字，理论上知乎无从感知。但仍请自行评估使用风险，见下方免责声明。

**Q：支持 Firefox / Safari 吗？**
A：Firefox 可以临时载入使用（见上方「Firefox 用户」，关闭浏览器后需重新载入）；Safari 暂不支持。

## ⚠️ 免责声明

本项目仅供个人学习 / 专注用途，只改变本地页面的显示文本。请遵守各站点服务条款及所在单位的相关规定，使用后果由使用者自行承担。

---

## 🛠️ 开发者指南

### 工作原理

- 替换 `document.title`（标签页标题）为标题池中随机一条
- 同步替换页面大标题元素为同一条（选择器由站点配置决定），知乎为：
  - `h1.QuestionHeader-title`（问题详情页，含吸顶标题）
  - `h1.Post-Title`（专栏文章页）
  - `.PinHeader-title`（想法页，若存在）
- 每次新页面加载、SPA 切页（路径变化）从标题池重新随机；同页内保持稳定，站点改写标题时只会被纠正回同一条
- 适配 SPA：history 钩子 + `MutationObserver` + 800ms 定时兜底
- **无 UI、装上即生效**：没有弹窗、没有工具栏图标，不需要任何操作
- **不修改任何网络请求**，不读取、不上传任何数据；不改动正文、回答、评论；不在未配置的站点上运行；没有后台脚本、没有额外权限（已移除 `storage`）

### 从源码安装

```bash
git clone https://github.com/z-Zihan/study-mode.git
```

然后在 `chrome://extensions` →「开发者模式」→「加载未打包的扩展程序」（旧版叫「加载已解压的扩展程序」），选择**仓库根目录**。Firefox 在 `about:debugging#/runtime/this-firefox` →「临时载入附加组件」选择 `manifest.json`。

> Chrome 可能提示 `browser_specific_settings`（Firefox 兼容字段）与 `//content_scripts`（manifest 内的说明字段）为未知字段，可忽略。

### 添加新站点

站点差异全部集中在 `src/sites.js` 的 `SITES` 配置表：

```js
const SITES = Object.freeze({
  zhihu: Object.freeze({
    name: '知乎',                                       // 站点名（备用）
    match: Object.freeze(['https://*.zhihu.com/*']),    // match pattern
    titleSelectors: Object.freeze(['h1.QuestionHeader-title', 'h1.Post-Title', '.PinHeader-title']),
    poolKey: 'ai-study'                                 // 使用哪个标题池
  })
  // 以后加豆瓣 / B 站只改这里
});
```

加站点后**必须同步** `manifest.json` 中 `content_scripts[0].matches`（所有站点 `match` 的并集），否则内容脚本不会注入。测试中有一条用例会检查两者是否同步。

### 自定义标题池

编辑 `src/content.js` 顶部的 `TITLE_POOLS`，键名即站点配置里的 `poolKey`。增删任意条目即可（每条是一个完整标题），也可以新增一个池给其他站点用，保存后在扩展管理页点「重新加载」。

```js
const TITLE_POOLS = Object.freeze({
  'ai-study': Object.freeze([
    'AI 学习笔记（一）：从零理解机器学习的基本概念',
    // ...在这里添加你自己的标题
  ])
});
```

> 测试中有一条用例校验 `ai-study` 标题池为 43 条，修改条数后请同步调整 `test/run-test.mjs`。

### 开发测试

```bash
npm install          # 安装 jsdom（仅测试用）
npm test             # 语法检查 + jsdom 功能测试
npm run icons        # 用 Pillow 重新生成 icons/（需 python3 + Pillow）
```

也可以单独运行测试：`node --test test/run-test.mjs`。测试会在 jsdom 中载入 `test/mock-zhihu.html`（仿知乎问题页结构），注入 chrome API stub 后按 manifest 顺序执行 `sites.js` + `content.js`，覆盖：初次替换、h1 同步、站点反写纠正、`<title>` 整体替换、pushState 导航（含多次导航随机选取）、同页稳定、开关关闭/实时切换、无扩展 API 时的降级、站点匹配、manifest 同步、未支持站点不动作。

### 发布

`.github/workflows/release.yml` 自动打包 `study-mode-v{version}.zip`（version 读自 `manifest.json`，排除 `.git`、`node_modules`、`test`、`scripts`、`.github`）：

- push 到 `main`：重建 `latest` 预发布，zip 始终是 main 最新构建
- push `v*` tag（如 `v1.1.0`）：创建同名正式 Release，自动生成 changelog

### 目录结构

```
manifest.json          MV3 清单（含 Firefox 兼容字段）
src/sites.js           站点配置表 + URL 匹配（content 载入）
src/content.js         内容脚本通用引擎：标题池、替换、SPA 适配、可选开关
icons/                 16 / 48 / 128 图标
scripts/gen-icons.py   图标生成脚本
test/                  仿知乎测试页与 jsdom 测试
.github/workflows/     自动打包发布
```

### 实现说明

浏览器中内容脚本运行在「隔离世界」，页面自身调用的 `history.pushState` 不会经过扩展的钩子。因此除钩子外，定时巡检还会比对 URL（`origin + pathname`），路径变化即视为新导航并重新随机，确保真实环境下切页也能换标题。

## License

[MIT](LICENSE) © 2026 z-Zihan

---

## English (quick)

**Study Mode** is a cross-browser MV3 extension that replaces the tab title and the on-page headline with study-style titles (e.g. "Machine learning fundamentals"). Sites are configured in `src/sites.js`; **currently supported: Zhihu**.

- Pure DOM display-layer replacement — no network requests are touched, no data collected, no extra permissions.
- A random title is picked for every new page / SPA navigation and stays stable on that page (no timed rotation). Fully automatic — no manual interaction needed.
- Handles SPAs via history hooks, `MutationObserver`, and an 800 ms fallback check.
- No UI at all: no popup, no toolbar icon — works automatically once installed. Toggle removed in v1.3.0; disable via the extensions page if needed.
- Install (zip): open the [latest release](https://github.com/z-Zihan/study-mode/releases/tag/latest) → download `study-mode-v*.zip` from Assets → unzip → `chrome://extensions` → Developer mode → Load unpacked ("Load unpacked" in older versions) → select the unzipped folder (the one containing `manifest.json`).
- Install (dev): `git clone` → Load unpacked → select the repo root. Firefox → `about:debugging` → Load Temporary Add-on → pick `manifest.json`.
- Add a site: add an entry to `SITES` in `src/sites.js` **and** its match pattern to `manifest.json`. Customize titles via `TITLE_POOLS` in `src/content.js`. Run tests with `npm install && npm test`.
- For personal study/focus use only; please respect each site's Terms of Service.
