/**
 * jsdom 功能测试：node --test test/run-test.mjs（或 npm test）
 *
 * 每个用例新建一个 jsdom 窗口载入 mock-zhihu.html，注入 chrome API stub 后
 * 依次执行 src/sites.js 与 src/content.js（与 manifest 注入顺序一致），再验证
 * 标题替换、反写防御、SPA 导航、开关与消息，以及站点配置表的匹配与同步。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = new URL('../', import.meta.url);
const SITES_SRC = readFileSync(fileURLToPath(new URL('src/sites.js', ROOT)), 'utf8');
const CONTENT_SRC = readFileSync(fileURLToPath(new URL('src/content.js', ROOT)), 'utf8');
const MANIFEST = JSON.parse(readFileSync(fileURLToPath(new URL('manifest.json', ROOT)), 'utf8'));
const MOCK_HTML = readFileSync(fileURLToPath(new URL('test/mock-zhihu.html', ROOT)), 'utf8');

const PAGE_URL = 'https://www.zhihu.com/question/123';
const ORIGINAL_TITLE = '如何看待XXX? - 知乎';
const ORIGINAL_H1 = '如何看待XXX?';
const HEADER_SELECTOR = 'h1.QuestionHeader-title';

/** 内容脚本兜底巡检间隔（与 content.js 一致），反写必须在此时间内被纠正。 */
const CHECK_INTERVAL_MS = 800;
/** 轮询等待的步长。 */
const POLL_STEP_MS = 20;
/** 模拟 storage.get 的异步延迟。 */
const STORAGE_DELAY_MS = 5;

/** 从源码中解析出知乎使用的 ai-study 标题池，保证测试与源码同步。 */
const TITLE_POOL = (() => {
  const match = CONTENT_SRC.match(/'ai-study': Object\.freeze\((\[[\s\S]*?\])\)/);
  assert.ok(match, '无法在 content.js 中找到 ai-study 标题池');
  return new Function(`return ${match[1]};`)();
})();

/** 在独立作用域中执行 sites.js，取出 SITES 与 findSite 供单元断言使用。 */
const { SITES, findSite } = new Function(`${SITES_SRC}\nreturn { SITES, findSite };`)();

/**
 * 构造最小 chrome API stub。
 * @param {{enabled?: boolean}} stored storage.local 初始内容
 */
function createChromeStub(stored) {
  const data = { ...stored };
  const changeListeners = [];
  const messageListeners = [];
  return {
    storage: {
      local: {
        get(_key, cb) {
          setTimeout(() => cb({ ...data }), STORAGE_DELAY_MS);
        },
        set(items) {
          const changes = {};
          for (const [k, v] of Object.entries(items)) {
            changes[k] = { oldValue: data[k], newValue: v };
            data[k] = v;
          }
          changeListeners.forEach((fn) => fn(changes, 'local'));
        }
      },
      onChanged: { addListener: (fn) => changeListeners.push(fn) }
    },
    runtime: {
      onMessage: { addListener: (fn) => messageListeners.push(fn) }
    },
    /** 测试辅助：模拟 popup 发消息，返回同步 sendResponse 的内容。 */
    _send(message) {
      let response;
      messageListeners.forEach((fn) => fn(message, {}, (r) => { response = r; }));
      return response;
    }
  };
}

/**
 * 新建页面并执行内容脚本。
 * 浏览器中同一扩展的多个内容脚本共享全局词法作用域；jsdom 的 window.eval
 * 每次调用各自隔离 const，因此把 sites.js 与 content.js 拼接后一次执行。
 * @param {{stored?: object, withChrome?: boolean, url?: string}} [opts]
 */
function load({ stored = {}, withChrome = true, url = PAGE_URL } = {}) {
  const dom = new JSDOM(MOCK_HTML, { url, runScripts: 'outside-only' });
  const { window } = dom;
  const chrome = withChrome ? createChromeStub(stored) : undefined;
  if (chrome) window.chrome = chrome;
  window.eval(`${SITES_SRC}\n${CONTENT_SRC}`);
  return { window, document: window.document, chrome };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 轮询直到条件成立或超时。
 * @param {() => boolean} cond
 * @param {number} timeoutMs
 */
async function waitFor(cond, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start <= timeoutMs) {
    if (cond()) return Date.now() - start;
    await sleep(POLL_STEP_MS);
  }
  throw new Error(`等待超时（${timeoutMs}ms）`);
}

const inPool = (t) => TITLE_POOL.includes(t);
const headerTexts = (doc) => [...doc.querySelectorAll(HEADER_SELECTOR)].map((el) => el.textContent);

/** 用例结束时关闭窗口，清理 interval。 */
function withPage(opts, fn) {
  return async () => {
    const page = load(opts);
    try {
      await fn(page);
    } finally {
      page.window.close();
    }
  };
}

test('标题池共 30 条且不含敏感字眼', () => {
  assert.equal(TITLE_POOL.length, 30);
  for (const t of TITLE_POOL) {
    assert.ok(!/知乎|伪装/.test(t), `标题含敏感字眼：${t}`);
  }
});

test('测试1：载入后 document.title 变为标题池中的一条', withPage({}, async ({ document }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);
  assert.ok(inPool(document.title));
}));

test('测试2：h1 文本同步为同一条', withPage({}, async ({ document }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);
  const texts = headerTexts(document);
  assert.equal(texts.length, 2);
  texts.forEach((t) => assert.equal(t, document.title));
}));

test('测试3：站点把 title / h1 改回原文，800ms 内被纠正', withPage({}, async ({ document }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);
  const desired = document.title;

  document.title = ORIGINAL_TITLE;
  document.querySelectorAll(HEADER_SELECTOR).forEach((el) => { el.textContent = ORIGINAL_H1; });

  const elapsed = await waitFor(
    () => document.title === desired && headerTexts(document).every((t) => t === desired),
    CHECK_INTERVAL_MS
  );
  console.log(`  反写纠正耗时 ≈ ${elapsed}ms`);
}));

test('测试3b：<title> 元素被整体替换后仍被纠正', withPage({}, async ({ document }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);
  const desired = document.title;

  const fresh = document.createElement('title');
  fresh.textContent = ORIGINAL_TITLE;
  document.querySelector('title').replaceWith(fresh);

  await waitFor(() => document.title === desired, CHECK_INTERVAL_MS);
  // 新 title 元素也应进入观察：再次改写依旧被纠正
  fresh.textContent = ORIGINAL_TITLE;
  await waitFor(() => document.title === desired, CHECK_INTERVAL_MS);
}));

test('测试4：pushState 导航后换成另一条池内标题', withPage({}, async ({ window, document }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);
  const before = document.title;

  // 模拟知乎 SPA：pushState 后重写 title 与 h1
  window.history.pushState({}, '', '/question/456');
  document.title = '另一个八卦问题? - 知乎';
  document.querySelectorAll(HEADER_SELECTOR).forEach((el) => { el.textContent = '另一个八卦问题?'; });

  await waitFor(
    () => inPool(document.title) && headerTexts(document).every((t) => t === document.title),
    CHECK_INTERVAL_MS
  );
  assert.notEqual(document.title, before, '新导航应重新随机');
}));

test('测试4b：绕过钩子的 pushState（模拟隔离世界）由 URL 巡检兜住', withPage({}, async ({ window, document }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);
  const before = document.title;

  window.History.prototype.pushState.call(window.history, {}, '', '/question/789');
  await waitFor(() => inPool(document.title) && document.title !== before, CHECK_INTERVAL_MS * 2);
}));

test('测试4c：同一导航内标题保持稳定（不闪烁）', withPage({}, async ({ document }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);
  const desired = document.title;
  await sleep(CHECK_INTERVAL_MS * 2);
  assert.equal(document.title, desired);
}));

test('测试4d：两次 pushState 导航选中的标题都来自标题池', withPage({}, async ({ window, document }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);

  const picked = [];
  for (const path of ['/question/1001', '/question/1002']) {
    window.history.pushState({}, '', path);
    await waitFor(
      () => inPool(document.title) && headerTexts(document).every((t) => t === document.title),
      CHECK_INTERVAL_MS
    );
    picked.push(document.title);
  }
  // 随机选取，两次可能相同也可能不同，只要求都在池内
  picked.forEach((t) => assert.ok(inPool(t), `导航后标题不在池中：${t}`));
}));

test('测试5：enabled=false 时 title 与 h1 不被替换', withPage({ stored: { enabled: false } }, async ({ document }) => {
  await sleep(CHECK_INTERVAL_MS + POLL_STEP_MS * 5);
  assert.equal(document.title, ORIGINAL_TITLE);
  headerTexts(document).forEach((t) => assert.equal(t, ORIGINAL_H1));
}));

test('测试6：storage.onChanged 实时开关，关闭时还原原文', withPage({}, async ({ document, chrome }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);

  chrome.storage.local.set({ enabled: false });
  assert.equal(document.title, ORIGINAL_TITLE);
  headerTexts(document).forEach((t) => assert.equal(t, ORIGINAL_H1));
  await sleep(CHECK_INTERVAL_MS + POLL_STEP_MS * 5);
  assert.equal(document.title, ORIGINAL_TITLE, '关闭后不应再被巡检改写');

  chrome.storage.local.set({ enabled: true });
  assert.ok(inPool(document.title));
}));

test('测试7：FB_GET_CURRENT 返回当前标题', withPage({}, async ({ document, chrome }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);
  const before = document.title;

  const current = chrome._send({ type: 'FB_GET_CURRENT' });
  // 回包对象来自 jsdom 窗口的 realm，展开到本 realm 再比较结构
  assert.deepEqual({ ...current }, { ok: true, title: before, enabled: true, poolSize: TITLE_POOL.length });

  // 未知消息不回包
  assert.equal(chrome._send({ type: 'OTHER' }), undefined);
}));

test('测试8：无 chrome API 时安静降级，默认启用', withPage({ withChrome: false }, async ({ document }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);
  headerTexts(document).forEach((t) => assert.equal(t, document.title));
}));

test('测试9：站点配置表——findSite 按 URL 匹配知乎，其他站点返回 null', () => {
  for (const url of [
    'https://www.zhihu.com/question/123',
    'https://zhuanlan.zhihu.com/p/1',
    'https://zhihu.com/'
  ]) {
    const site = findSite(url);
    assert.ok(site, `应匹配：${url}`);
    assert.equal(site.key, 'zhihu');
    assert.equal(site.name, '知乎');
    assert.equal(site.poolKey, 'ai-study');
  }
  for (const url of [
    'https://www.example.com/',
    'https://notzhihu.com/',
    'https://zhihu.com.evil.example/',
    'http://www.zhihu.com/',
    'chrome://extensions/',
    'not a url'
  ]) {
    assert.equal(findSite(url), null, `不应匹配：${url}`);
  }
});

test('测试10：manifest 的 matches 覆盖 sites.js 中所有站点的 match', () => {
  const matches = new Set(MANIFEST.content_scripts.flatMap((cs) => cs.matches));
  for (const [key, site] of Object.entries(SITES)) {
    for (const pattern of site.match) {
      assert.ok(matches.has(pattern), `站点 ${key} 的 ${pattern} 未同步到 manifest`);
    }
  }
  const js = MANIFEST.content_scripts[0].js;
  assert.ok(js.indexOf('src/sites.js') !== -1 && js.indexOf('src/sites.js') < js.indexOf('src/content.js'),
    'sites.js 必须先于 content.js 注入');
});

test('测试11：不在配置表中的站点不做任何替换', withPage({ url: 'https://www.example.com/page' }, async ({ document }) => {
  await sleep(CHECK_INTERVAL_MS + POLL_STEP_MS * 5);
  assert.equal(document.title, ORIGINAL_TITLE);
  headerTexts(document).forEach((t) => assert.equal(t, ORIGINAL_H1));
}));

test('测试12：吸顶 header 克隆（类名不在 titleSelectors 中）按原文匹配被替换', withPage({}, async ({ document }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);
  const desired = document.title;

  // 模拟滚动后站点动态插入的吸顶标题：div.StickyHeader > span.title-clone，文本不带「 - 知乎」
  const sticky = document.createElement('div');
  sticky.className = 'StickyHeader';
  const clone = document.createElement('span');
  clone.className = 'title-clone';
  clone.textContent = ORIGINAL_H1;
  sticky.appendChild(clone);
  document.body.appendChild(sticky);

  await waitFor(() => clone.textContent === desired, CHECK_INTERVAL_MS);

  // 站点再次把原文写回，仍被纠正
  clone.textContent = ORIGINAL_H1;
  await waitFor(() => clone.textContent === desired, CHECK_INTERVAL_MS);
}));

test('测试12b：原文匹配不误伤其他文本 / 自身忽略节点，关闭开关时还原', withPage({}, async ({ document, chrome }) => {
  await waitFor(() => inPool(document.title), CHECK_INTERVAL_MS);
  const desired = document.title;

  const clone = document.createElement('span');
  clone.textContent = ORIGINAL_H1;
  const ignored = document.createElement('div');
  ignored.setAttribute('data-fb-ignore', '');
  ignored.innerHTML = `<span>${ORIGINAL_H1}</span>`;
  const partial = document.createElement('p');
  partial.textContent = `${ORIGINAL_H1} 的回答`;
  document.body.append(clone, ignored, partial);

  await waitFor(() => clone.textContent === desired, CHECK_INTERVAL_MS);
  assert.equal(ignored.firstChild.textContent, ORIGINAL_H1, 'data-fb-ignore 子树不应被替换');
  assert.equal(partial.textContent, `${ORIGINAL_H1} 的回答`, '仅部分包含原文的元素不应被替换');
  assert.equal(document.querySelector('.AppHeader-logo').textContent, '知乎');

  chrome.storage.local.set({ enabled: false });
  assert.equal(clone.textContent, ORIGINAL_H1, '关闭后克隆标题应还原');
}));
