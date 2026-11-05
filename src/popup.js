/**
 * 学习模式 Study Mode —— 弹窗脚本
 *
 * - 站点：用 sites.js 的 findSite 匹配当前标签页 URL，显示站点名或「当前页面不支持」；
 * - 开关：读写 chrome.storage.local 的 enabled，内容脚本通过 onChanged 实时生效；
 * - 展示：通过 FB_GET_CURRENT 获取当前标题与标题池条数。
 */
(function () {
  'use strict';

  /** storage.local 中开关状态的键名（与 content.js 保持一致）。 */
  const STORAGE_KEY_ENABLED = 'enabled';

  /** 开关默认值。 */
  const DEFAULT_ENABLED = true;

  /** 消息类型（与 content.js 保持一致）。 */
  const MSG_GET_CURRENT = 'FB_GET_CURRENT';

  /** 当前页面不在站点配置表中时的提示。 */
  const TEXT_UNSUPPORTED = '当前页面不支持';

  /** 站点受支持但内容脚本未响应（如安装扩展前就已打开的标签页）时的提示。 */
  const HINT_RELOAD = '请刷新页面后再试';

  const toggle = /** @type {HTMLInputElement} */ (document.getElementById('enabled'));
  const currentTitleEl = document.getElementById('current-title');
  const poolSizeEl = document.getElementById('pool-size');
  const hintEl = document.getElementById('hint');
  const siteEl = document.getElementById('site');

  /** 当前标签页对应的站点配置；未知或不支持时为 null。 */
  let currentSite = null;

  /** @returns {boolean} 扩展 API 是否可用 */
  function hasChrome() {
    return typeof chrome !== 'undefined' && !!chrome && !!chrome.storage && !!chrome.tabs;
  }

  /**
   * 用内容脚本的回包刷新界面。
   * @param {{title?: string, poolSize?: number}|undefined} response
   */
  function render(response) {
    if (!response || !response.ok) {
      markUnavailable();
      return;
    }
    currentTitleEl.textContent = response.title || '—';
    poolSizeEl.textContent = String(response.poolSize);
    hintEl.textContent = '';
  }

  /** 当前标签页无法通信：清空标题并提示。 */
  function markUnavailable() {
    currentTitleEl.textContent = '—';
    hintEl.textContent = currentSite ? HINT_RELOAD : '';
  }

  /**
   * 显示当前站点名；不支持的页面显示「当前页面不支持」。
   * @param {{name: string}|null} site
   */
  function renderSite(site) {
    currentSite = site;
    siteEl.textContent = site ? site.name : TEXT_UNSUPPORTED;
    siteEl.classList.toggle('unsupported', !site);
  }

  /**
   * 向当前激活标签页发送消息。失败（不支持的站点 / 未注入）时回调 undefined。
   * 每次调用时顺便根据标签页 URL 刷新站点显示（URL 来自 manifest 匹配站点的 host 权限）。
   * @param {string} type
   * @param {function(any): void} done
   */
  function sendToActiveTab(type, done) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs && tabs[0];
      renderSite(tab && tab.url && typeof findSite === 'function' ? findSite(tab.url) : null);
      if (!tab || typeof tab.id !== 'number' || !currentSite) {
        done(undefined);
        return;
      }
      try {
        chrome.tabs.sendMessage(tab.id, { type: type }, function (response) {
          // 读取 lastError 以免控制台报 "Unchecked runtime.lastError"
          if (chrome.runtime.lastError) {
            done(undefined);
            return;
          }
          done(response);
        });
      } catch (_) {
        done(undefined);
      }
    });
  }

  function init() {
    if (!hasChrome()) {
      renderSite(null);
      markUnavailable();
      return;
    }

    chrome.storage.local.get(STORAGE_KEY_ENABLED, function (items) {
      const value = items && items[STORAGE_KEY_ENABLED];
      toggle.checked = typeof value === 'boolean' ? value : DEFAULT_ENABLED;
    });

    toggle.addEventListener('change', function () {
      chrome.storage.local.set({ [STORAGE_KEY_ENABLED]: toggle.checked });
    });

    sendToActiveTab(MSG_GET_CURRENT, render);
  }

  init();
})();
