/**
 * 学习模式 Study Mode —— 站点配置表
 *
 * content.js（通用引擎）与 popup.js 共用。两者都以普通脚本方式先载入本文件，
 * 顶层的 SITES / findSite 在同一全局作用域中可见。
 *
 * 新增站点只需在 SITES 里加一个条目：
 * - name：弹窗中显示的站点名；
 * - match：与 manifest 相同语法的 match pattern（scheme://host/path）；
 * - titleSelectors：需要同步替换的页面大标题选择器；
 * - poolKey：使用 content.js 中 TITLE_POOLS 的哪个标题池（默认 'ai-study'）。
 *
 * 注意：加站点后必须把 match 同步到 manifest.json 的 content_scripts.matches，
 * 否则内容脚本根本不会注入到该站点。
 */

/** 未指定 poolKey 时使用的标题池。 */
const DEFAULT_POOL_KEY = 'ai-study';

const SITES = Object.freeze({
  zhihu: Object.freeze({
    name: '知乎',
    match: Object.freeze(['https://*.zhihu.com/*']),
    // 问题详情页（含吸顶标题）/ 专栏文章页 / 想法页。
    // 吸顶 header 里的克隆标题不一定是 h1，故同时列出容器级与已知吸顶类名；
    // 仍漏掉的由 content.js 的原文匹配兜底。
    titleSelectors: Object.freeze([
      'h1.QuestionHeader-title',
      '.QuestionHeader-title',
      '.QuestionHeader-fixable .QuestionHeader-title',
      '.AppHeader-inner .QuestionHeader-title',
      'h1.Post-Title',
      '.ColumnPageHeader-title',
      '.PinHeader-title'
    ]),
    poolKey: 'ai-study'
  })
  // 以后加豆瓣 / B 站只改这里（并同步 manifest）
});

/**
 * URL 是否命中一条 match pattern。只比较 scheme 与 host（现有配置 path 均为 /*）。
 * host 为 `*.example.com` 时同时匹配 example.com 本身，与浏览器规则一致。
 * @param {URL} url
 * @param {string} pattern
 * @returns {boolean}
 */
function matchesPattern(url, pattern) {
  const m = /^(\*|https?):\/\/([^/]+)\//.exec(pattern);
  if (!m) return false;
  const scheme = url.protocol.slice(0, -1);
  if (m[1] === '*' ? scheme !== 'http' && scheme !== 'https' : scheme !== m[1]) return false;
  const host = url.hostname;
  if (m[2] === '*') return true;
  if (m[2].indexOf('*.') === 0) {
    const base = m[2].slice(2);
    return host === base || host.endsWith('.' + base);
  }
  return host === m[2];
}

/**
 * 根据 URL 查找站点配置；不支持的站点返回 null。
 * @param {string|URL|Location} href
 * @returns {{key: string, name: string, match: ReadonlyArray<string>,
 *            titleSelectors: ReadonlyArray<string>, poolKey: string}|null}
 */
function findSite(href) {
  let url;
  try {
    url = new URL(String(href));
  } catch (_) {
    return null;
  }
  for (const key of Object.keys(SITES)) {
    const site = SITES[key];
    if (site.match.some(function (p) { return matchesPattern(url, p); })) {
      return Object.assign({ key: key }, site, { poolKey: site.poolKey || DEFAULT_POOL_KEY });
    }
  }
  return null;
}
