# 学习模式 Study Mode

一个跨浏览器（Chrome / Edge 为主，兼容 Firefox）的 Manifest V3 扩展：浏览网页时，把**浏览器标签页标题**和**页面内的大标题**替换成学习类标题。采用站点配置表架构，持续添加新站点。

**当前支持：知乎**

> 例如：打开一个知乎八卦问题，标签页和问题大标题显示的是「机器学习基础知识点梳理：偏差、方差与过拟合」。

<!-- 截图占位：将截图放到 docs/screenshot.png 后取消注释 -->
<!-- ![截图](docs/screenshot.png) -->

## 它做什么

- 替换 `document.title`（标签页标题）为标题池中随机一条
- 同步替换页面大标题元素为同一条（选择器由站点配置决定），知乎为：
  - `h1.QuestionHeader-title`（问题详情页，含吸顶标题）
  - `h1.Post-Title`（专栏文章页）
  - `.PinHeader-title`（想法页，若存在）
- 适配 SPA：history 钩子 + `MutationObserver` + 800ms 定时兜底，站点把标题写回后会被立即纠正
- 弹窗：显示当前站点名（不支持的页面显示「当前页面不支持」）、一键开关（记忆状态）、查看当前标题与标题池条数；无需任何手动操作
- 关闭开关时尽量还原站点原始标题

### 随机标题的行为

- **每打开一个新页面随机选一条**：新页面加载、SPA 切页（路径变化）都会从标题池重新随机选取
- **同一页面内保持稳定**：不会定时轮换，也不会闪烁；站点改写标题时只会被纠正回同一条
- 完全自动、无需手动触发：想看新标题，打开新页面即可

## 它不做什么

- **不修改任何网络请求**，不读取、不上传任何数据；纯 DOM 展示层的文本替换
- 不改动正文、回答、评论等其他内容
- 不在未配置的站点上运行；没有后台脚本，只申请 `storage` 权限用于记住开关

## 安装

### 下载 zip（推荐）

1. 打开 [Releases 页面的 latest](https://github.com/z-Zihan/study-mode/releases/tag/latest)（main 分支最新构建，自动更新；正式版见 [全部 Releases](https://github.com/z-Zihan/study-mode/releases)）
2. 下载 `study-mode-v版本号.zip` 并**解压**
3. 打开 `chrome://extensions`（Edge 为 `edge://extensions`），打开右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择**解压出来的目录**（里面有 `manifest.json`）

> 升级：下载新 zip 解压覆盖原目录，然后在扩展管理页点「重新加载」。解压目录不要删除，否则扩展会失效。

### 开发者安装

```bash
git clone https://github.com/z-Zihan/study-mode.git
```

然后在 `chrome://extensions` →「开发者模式」→「加载已解压的扩展程序」，选择**仓库根目录**。

> Chrome 可能提示 `browser_specific_settings`（Firefox 兼容字段）与 `//content_scripts`（manifest 内的说明字段）为未知字段，可忽略，不影响加载。

### Firefox

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件」，选择解压目录或仓库根目录下的 `manifest.json`

## 添加新站点

站点差异全部集中在 `src/sites.js` 的 `SITES` 配置表：

```js
const SITES = Object.freeze({
  zhihu: Object.freeze({
    name: '知乎',                                       // 弹窗中显示的站点名
    match: Object.freeze(['https://*.zhihu.com/*']),    // match pattern
    titleSelectors: Object.freeze(['h1.QuestionHeader-title', 'h1.Post-Title', '.PinHeader-title']),
    poolKey: 'ai-study'                                 // 使用哪个标题池
  })
  // 以后加豆瓣 / B 站只改这里
});
```

加站点后**必须同步** `manifest.json` 中 `content_scripts[0].matches`（所有站点 `match` 的并集），否则内容脚本不会注入。测试中有一条用例会检查两者是否同步。

## 自定义标题池

编辑 `src/content.js` 顶部的 `TITLE_POOLS`，键名即站点配置里的 `poolKey`。增删任意条目即可（每条是一个完整标题），也可以新增一个池给其他站点用，保存后在扩展管理页点「重新加载」。

```js
const TITLE_POOLS = Object.freeze({
  'ai-study': Object.freeze([
    'AI 学习笔记（一）：从零理解机器学习的基本概念',
    // ...在这里添加你自己的标题
  ])
});
```

> 测试中有一条用例校验 `ai-study` 标题池为 30 条，修改条数后请同步调整 `test/run-test.mjs`。

## 开发

```bash
npm install          # 安装 jsdom（仅测试用）
npm test             # 语法检查 + jsdom 功能测试
npm run icons        # 用 Pillow 重新生成 icons/（需 python3 + Pillow）
```

也可以单独运行测试：`node --test test/run-test.mjs`。测试会在 jsdom 中载入 `test/mock-zhihu.html`（仿知乎问题页结构），注入 chrome API stub 后按 manifest 顺序执行 `sites.js` + `content.js`，覆盖：初次替换、h1 同步、站点反写纠正、`<title>` 整体替换、pushState 导航（含多次导航随机选取）、同页稳定、开关关闭/实时切换、弹窗消息、无扩展 API 时的降级、站点匹配、manifest 同步、未支持站点不动作。

### 发布

`.github/workflows/release.yml` 自动打包 `study-mode-v{version}.zip`（version 读自 `manifest.json`，排除 `.git`、`node_modules`、`test`、`scripts`、`.github`）：

- push 到 `main`：重建 `latest` 预发布，zip 始终是 main 最新构建
- push `v*` tag（如 `v1.1.0`）：创建同名正式 Release，自动生成 changelog

### 目录结构

```
manifest.json          MV3 清单（含 Firefox 兼容字段）
src/sites.js           站点配置表 + URL 匹配（content 与 popup 共用）
src/content.js         内容脚本通用引擎：标题池、替换、SPA 适配、开关与消息
src/popup.html/js/css  弹窗
icons/                 16 / 48 / 128 图标
scripts/gen-icons.py   图标生成脚本
test/                  仿知乎测试页与 jsdom 测试
.github/workflows/     自动打包发布
```

### 实现说明

浏览器中内容脚本运行在「隔离世界」，页面自身调用的 `history.pushState` 不会经过扩展的钩子。因此除钩子外，定时巡检还会比对 URL（`origin + pathname`），路径变化即视为新导航并重新随机，确保真实环境下切页也能换标题。

## 免责声明

本项目仅供个人学习 / 专注用途，只改变本地页面的显示文本。请遵守各站点服务条款及所在单位的相关规定，使用后果由使用者自行承担。

## License

[MIT](LICENSE) © 2026 z-Zihan

---

## English (quick)

**Study Mode** is a cross-browser MV3 extension that replaces the tab title and the on-page headline with study-style titles (e.g. "Machine learning fundamentals"). Sites are configured in `src/sites.js`; **currently supported: Zhihu**.

- Pure DOM display-layer replacement — no network requests are touched, no data collected.
- A random title is picked for every new page / SPA navigation and stays stable on that page (no timed rotation). Fully automatic — no manual interaction needed.
- Handles SPAs via history hooks, `MutationObserver`, and an 800 ms fallback check.
- Popup: current site name ("not supported" elsewhere), on/off toggle (persisted), current title display.
- Install (zip): open the [latest release](https://github.com/z-Zihan/study-mode/releases/tag/latest) → download the zip → unzip → `chrome://extensions` → Developer mode → Load unpacked → select the unzipped folder.
- Install (dev): `git clone` → Load unpacked → select the repo root. Firefox → `about:debugging` → Load Temporary Add-on → pick `manifest.json`.
- Add a site: add an entry to `SITES` in `src/sites.js` **and** its match pattern to `manifest.json`. Customize titles via `TITLE_POOLS` in `src/content.js`. Run tests with `npm install && npm test`.
- For personal study/focus use only; please respect each site's Terms of Service.
