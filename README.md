# 知乎 AI 学习模式

一个跨浏览器（Chrome / Edge 为主，兼容 Firefox）的 Manifest V3 扩展：浏览知乎时，把**浏览器标签页标题**和**页面内的大标题**替换成「AI 学习」类标题。

> 例如：打开一个八卦问题，标签页和问题大标题显示的是「机器学习基础知识点梳理：偏差、方差与过拟合」。

<!-- 截图占位：将截图放到 docs/screenshot.png 后取消注释 -->
<!-- ![截图](docs/screenshot.png) -->

## 它做什么

- 替换 `document.title`（标签页标题）为标题池中随机一条
- 同步替换页面标题元素为同一条：
  - `h1.QuestionHeader-title`（问题详情页，含吸顶标题）
  - `h1.Post-Title`（专栏文章页）
  - `.PinHeader-title`（想法页，若存在）
- 每次页面加载 / SPA 切页随机换一条，同一页面内保持稳定，不闪烁
- 适配知乎 SPA：history 钩子 + `MutationObserver` + 800ms 定时兜底，站点把标题写回后会被立即纠正
- 弹窗：一键开关（记忆状态）、「换一个标题」、查看当前标题与标题池条数
- 关闭开关时尽量还原站点原始标题

## 它不做什么

- **不修改任何网络请求**，不读取、不上传任何数据；纯 DOM 展示层的文本替换
- 不改动正文、回答、评论等其他内容
- 没有后台脚本，不需要 host 权限，只申请 `storage` 权限用于记住开关

## 安装

### Chrome / Edge

1. 打开 `chrome://extensions`（Edge 为 `edge://extensions`）
2. 打开右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择**仓库根目录**（包含 `manifest.json` 的目录）

> Chrome 会提示 `browser_specific_settings` 为未知字段，这是为 Firefox 兼容保留的，可忽略，不影响加载。

### Firefox

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件」，选择仓库根目录下的 `manifest.json`

## 自定义标题池

编辑 `src/content.js` 顶部的 `TITLE_POOL` 数组，增删任意条目即可（每条是一个完整标题），保存后在扩展管理页点「重新加载」。

```js
const TITLE_POOL = Object.freeze([
  'AI 学习笔记（一）：从零理解机器学习的基本概念',
  // ...在这里添加你自己的标题
]);
```

> 测试中有一条用例校验标题池为 30 条，修改条数后请同步调整 `test/run-test.mjs`。

## 开发

```bash
npm install          # 安装 jsdom（仅测试用）
npm test             # 语法检查 + jsdom 功能测试
npm run icons        # 用 Pillow 重新生成 icons/（需 python3 + Pillow）
```

也可以单独运行测试：`node --test test/run-test.mjs`。测试会在 jsdom 中载入 `test/mock-zhihu.html`（仿知乎问题页结构），注入 chrome API stub 后执行内容脚本，覆盖：初次替换、h1 同步、站点反写纠正、`<title>` 整体替换、pushState 导航、开关关闭/实时切换、弹窗消息、无扩展 API 时的降级。

### 目录结构

```
manifest.json          MV3 清单（含 Firefox 兼容字段）
src/content.js         内容脚本：标题池、替换、SPA 适配、开关与消息
src/popup.html/js/css  弹窗
icons/                 16 / 48 / 128 图标
scripts/gen-icons.py   图标生成脚本
test/                  仿知乎测试页与 jsdom 测试
```

### 实现说明

浏览器中内容脚本运行在「隔离世界」，知乎页面自身调用的 `history.pushState` 不会经过扩展的钩子。因此除钩子外，定时巡检还会比对 URL（`origin + pathname`），路径变化即视为新导航并重新随机，确保真实环境下切页也能换标题。

## 免责声明

本项目仅供个人学习 / 专注用途，只改变本地页面的显示文本。请遵守知乎服务条款及所在单位的相关规定，使用后果由使用者自行承担。

## License

[MIT](LICENSE) © 2026 z-Zihan

---

## English (quick)

**Zhihu AI Study Mode** is a cross-browser MV3 extension that replaces the tab title and the on-page headline on zhihu.com with AI-study-style titles (e.g. "Machine learning fundamentals").

- Pure DOM display-layer replacement — no network requests are touched, no data collected.
- Handles Zhihu's React SPA via history hooks, `MutationObserver`, and an 800 ms fallback check.
- Popup: on/off toggle (persisted), "shuffle" button, current title display.
- Install: Chrome/Edge → `chrome://extensions` → Developer mode → Load unpacked → select repo root. Firefox → `about:debugging` → Load Temporary Add-on → pick `manifest.json`.
- Customize titles via `TITLE_POOL` at the top of `src/content.js`. Run tests with `npm install && npm test`.
- For personal study/focus use only; please respect Zhihu's Terms of Service.
