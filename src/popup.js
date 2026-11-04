/**
 * 知乎 AI 学习模式 —— 弹窗脚本
 *
 * - 开关：读写 chrome.storage.local 的 enabled，内容脚本通过 onChanged 实时生效；
 * - 换一个：向当前激活标签页发送 FB_SHUFFLE；
 * - 展示：通过 FB_GET_CURRENT 获取当前标题与标题池条数。
 */
(function () {
  'use strict';

  /** storage.local 中开关状态的键名（与 content.js 保持一致）。 */
  const STORAGE_KEY_ENABLED = 'enabled';

  /** 开关默认值。 */
  const DEFAULT_ENABLED = true;

  /** 消息类型（与 content.js 保持一致）。 */
  const MSG_SHUFFLE = 'FB_SHUFFLE';
  const MSG_GET_CURRENT = 'FB_GET_CURRENT';

  /** 当前标签页不在知乎（或内容脚本未注入）时的提示。 */
  const HINT_NOT_ZHIHU = '请在知乎页面使用';

  const toggle = /** @type {HTMLInputElement} */ (document.getElementById('enabled'));
  const shuffleBtn = /** @type {HTMLButtonElement} */ (document.getElementById('shuffle'));
  const currentTitleEl = document.getElementById('current-title');
  const poolSizeEl = document.getElementById('pool-size');
  const hintEl = document.getElementById('hint');

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
    shuffleBtn.disabled = false;
    hintEl.textContent = '';
  }

  /** 当前标签页无法通信：禁用按钮并提示。 */
  function markUnavailable() {
    currentTitleEl.textContent = '—';
    shuffleBtn.disabled = true;
    hintEl.textContent = HINT_NOT_ZHIHU;
  }

  /**
   * 向当前激活标签页发送消息。失败（不在知乎 / 未注入）时回调 undefined。
   * @param {string} type
   * @param {function(any): void} done
   */
  function sendToActiveTab(type, done) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs && tabs[0];
      if (!tab || typeof tab.id !== 'number') {
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

    shuffleBtn.addEventListener('click', function () {
      shuffleBtn.disabled = true;
      sendToActiveTab(MSG_SHUFFLE, render);
    });

    sendToActiveTab(MSG_GET_CURRENT, render);
  }

  init();
})();
