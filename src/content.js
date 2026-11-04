/**
 * 知乎 AI 学习模式 —— 内容脚本
 *
 * 把标签页标题（document.title）与页面内的大标题元素替换为同一条
 * 「AI 学习」类标题。纯 DOM 展示层替换，不触碰任何网络请求。
 *
 * 设计要点：
 * - 零依赖、IIFE + 严格模式；chrome.* 不存在时安静降级（便于 jsdom 测试）。
 * - 每次导航（以 origin + pathname 区分）随机选一条，同一导航内保持稳定。
 * - 站点 SPA 会把标题写回：用 history 钩子 + MutationObserver + 定时兜底三层防御。
 */
(function () {
  'use strict';

  /**
   * 标题池：可自行增删，每条为一个完整的标签页 / 页面标题。
   * @type {ReadonlyArray<string>}
   */
  const TITLE_POOL = Object.freeze([
    'AI 学习笔记（一）：从零理解机器学习的基本概念',
    '机器学习入门：线性回归与梯度下降推导',
    '机器学习基础知识点梳理：偏差、方差与过拟合',
    '逻辑回归与交叉熵损失：一篇讲清楚',
    '决策树、随机森林与 XGBoost 对比总结',
    '深度学习入门：反向传播算法逐步推导',
    '卷积神经网络 CNN 原理与经典结构复盘',
    '循环神经网络 RNN 与 LSTM 学习笔记',
    'Transformer 架构精读：Self-Attention 到底在算什么',
    '位置编码详解：从绝对位置到 RoPE',
    '大模型（LLM）基础：预训练、微调与对齐流程梳理',
    'LLM 推理优化笔记：KV Cache 与量化入门',
    'LoRA 微调实践：参数高效微调原理与踩坑记录',
    '提示词工程（Prompt Engineering）实用技巧整理',
    'Chain-of-Thought 思维链提示的原理与实践',
    'RAG 检索增强生成：从向量检索到完整链路搭建',
    'Embedding 与向量数据库选型学习笔记',
    'NLP 基础：分词、词向量与语言模型发展脉络',
    'BERT 与 GPT 的区别：预训练目标对比分析',
    '计算机视觉入门：图像分类到目标检测的演进',
    'Vision Transformer（ViT）论文阅读笔记',
    '扩散模型（Diffusion）原理入门与公式推导',
    '强化学习基础：马尔可夫决策过程与 Q-Learning',
    'RLHF 学习笔记：奖励模型与 PPO 训练流程',
    'Python 机器学习实战：用 scikit-learn 完成第一个项目',
    'PyTorch 实战：从 Tensor 到训练一个完整模型',
    'AI 工具提效：用大模型辅助阅读论文与写代码',
    '2026 AI 学习路线：数学基础、框架与项目规划',
    '论文阅读方法：如何高效精读一篇顶会论文',
    '算法打卡第 30 天：动态规划经典题型总结'
  ]);

  /** 兜底巡检间隔（毫秒）。 */
  const CHECK_INTERVAL_MS = 800;

  /** storage.local 中开关状态的键名。 */
  const STORAGE_KEY_ENABLED = 'enabled';

  /** 开关默认值：未设置时启用。 */
  const DEFAULT_ENABLED = true;

  /** 与 popup 通信的消息类型（FB = FakeBrowse，避免与其他扩展撞名）。 */
  const MSG_SHUFFLE = 'FB_SHUFFLE';
  const MSG_GET_CURRENT = 'FB_GET_CURRENT';

  /**
   * 需要同步替换的页面标题元素选择器。
   * 问题详情页 / 专栏文章页 / 想法页。
   */
  const HEADER_SELECTORS = [
    'h1.QuestionHeader-title',
    'h1.Post-Title',
    '.PinHeader-title'
  ].join(',');

  /** 运行时状态。 */
  const state = {
    /** @type {boolean} 开关是否开启 */
    enabled: DEFAULT_ENABLED,
    /** @type {boolean} 是否已读完 storage（读完前不替换，避免关闭状态下闪烁） */
    ready: false,
    /** @type {number} 当前选中的标题池下标 */
    index: -1,
    /** @type {string} 当前导航的标识（origin + pathname） */
    navKey: '',
    /** @type {string} 最近一次观察到的站点原始标题，关闭开关时用于还原 */
    originalTitle: '',
    /** @type {Element|null} 当前被观察的 <title> 元素 */
    observedTitleEl: null,
    /** @type {boolean} 是否已排队一次 apply（合并高频 mutation） */
    scheduled: false
  };

  /** 记录被替换元素的原始文本，用于关闭开关时还原。 */
  const originalHeaderText = new WeakMap();

  /** 标题元素观察器（在 init 中创建）。 @type {MutationObserver|null} */
  let titleObserver = null;

  // ---------------------------------------------------------------------------
  // 工具函数
  // ---------------------------------------------------------------------------

  /**
   * 生成 [0, max) 的随机整数，优先使用 crypto。
   * @param {number} max
   * @returns {number}
   */
  function randomInt(max) {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] % max;
      }
    } catch (_) {
      // 落到 Math.random
    }
    return Math.floor(Math.random() * max);
  }

  /**
   * 重新随机选择一条标题；池大于 1 条时保证与上一条不同。
   */
  function pickNewTitle() {
    if (TITLE_POOL.length === 0) return;
    if (TITLE_POOL.length === 1) {
      state.index = 0;
      return;
    }
    let next = randomInt(TITLE_POOL.length);
    if (next === state.index) {
      next = (next + 1 + randomInt(TITLE_POOL.length - 1)) % TITLE_POOL.length;
    }
    state.index = next;
  }

  /**
   * 当前期望显示的标题。
   * @returns {string}
   */
  function desiredTitle() {
    return state.index >= 0 ? TITLE_POOL[state.index] : '';
  }

  /**
   * 文本是否为标题池中的一条。
   * @param {string} text
   * @returns {boolean}
   */
  function isPoolTitle(text) {
    return TITLE_POOL.indexOf(text) !== -1;
  }

  /**
   * 当前导航标识：只看 origin + pathname，忽略 query / hash，
   * 避免站点用 replaceState 改参数时频繁换标题。
   * @returns {string}
   */
  function currentNavKey() {
    try {
      return location.origin + location.pathname;
    } catch (_) {
      return '';
    }
  }

  /**
   * 安全获取 chrome 扩展 API 子对象。
   * @param {'storage'|'runtime'} name
   * @returns {any|null}
   */
  function chromeApi(name) {
    try {
      if (typeof chrome !== 'undefined' && chrome && chrome[name]) return chrome[name];
    } catch (_) {
      // 访问被拒绝时视为不存在
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // 应用 / 还原
  // ---------------------------------------------------------------------------

  /**
   * 把期望标题写入 document.title 与所有标题元素。仅在文本不同时才写，
   * 因此 observer 因自身写入而再次触发时不会形成循环。
   */
  function apply() {
    if (!state.ready || !state.enabled) return;
    const title = desiredTitle();
    if (!title) return;

    if (document.title !== title) {
      // 换一个时旧值是池内标题，不能当作站点原文保存
      if (!isPoolTitle(document.title)) state.originalTitle = document.title;
      document.title = title;
    }

    const headers = document.querySelectorAll(HEADER_SELECTORS);
    for (const el of headers) {
      if (el.textContent !== title) {
        if (!isPoolTitle(el.textContent)) originalHeaderText.set(el, el.textContent);
        el.textContent = title;
      }
    }
    ensureTitleObserved();
  }

  /**
   * 关闭开关时尽量还原站点原始文本。
   */
  function restore() {
    if (state.originalTitle && isPoolTitle(document.title)) {
      document.title = state.originalTitle;
    }
    const headers = document.querySelectorAll(HEADER_SELECTORS);
    for (const el of headers) {
      const original = originalHeaderText.get(el);
      if (original !== undefined && isPoolTitle(el.textContent)) {
        el.textContent = original;
      }
    }
  }

  /**
   * 页面状态是否已偏离期望（供定时兜底使用）。
   * @returns {boolean}
   */
  function isOutOfSync() {
    const title = desiredTitle();
    if (document.title !== title) return true;
    for (const el of document.querySelectorAll(HEADER_SELECTORS)) {
      if (el.textContent !== title) return true;
    }
    return false;
  }

  /**
   * 合并同一轮内的多次触发，下一个宏任务里统一 apply。
   */
  function scheduleApply() {
    if (state.scheduled) return;
    state.scheduled = true;
    setTimeout(function () {
      state.scheduled = false;
      apply();
    }, 0);
  }

  /**
   * 导航相关事件入口：路径变化时重新随机，然后立即应用。
   */
  function onNavigate() {
    const key = currentNavKey();
    if (key !== state.navKey) {
      state.navKey = key;
      pickNewTitle();
    }
    apply();
  }

  // ---------------------------------------------------------------------------
  // 观察与钩子
  // ---------------------------------------------------------------------------

  /**
   * 包装 history.pushState / replaceState，调用后触发 onNavigate。
   * 注意：浏览器中内容脚本运行在隔离世界，页面自身调用的 history 方法不会
   * 经过这里；因此 tick() 中还会比对 URL 作为补充。
   */
  function hookHistory() {
    if (typeof history === 'undefined' || !history) return;
    ['pushState', 'replaceState'].forEach(function (method) {
      const original = history[method];
      if (typeof original !== 'function') return;
      history[method] = function () {
        const result = original.apply(this, arguments);
        try {
          onNavigate();
        } catch (_) {
          // 钩子内的异常不能影响站点导航
        }
        return result;
      };
    });
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('hashchange', onNavigate);
  }

  /**
   * 确保当前 <title> 元素处于观察中；元素被整体替换时重新挂载。
   */
  function ensureTitleObserved() {
    if (!titleObserver) return;
    const titleEl = document.querySelector('title');
    if (!titleEl || titleEl === state.observedTitleEl) return;
    titleObserver.disconnect();
    titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
    state.observedTitleEl = titleEl;
  }

  /**
   * 挂载 MutationObserver：
   * - titleObserver：<title> 文本变化 → 立即重写；
   * - treeObserver：documentElement 子树增删（覆盖 head 中 title 被替换、
   *   h1 出现或被 React 重渲染）→ 合并后重写。
   */
  function observe() {
    if (typeof MutationObserver === 'undefined') return;

    titleObserver = new MutationObserver(function () {
      apply();
    });
    ensureTitleObserved();

    const treeObserver = new MutationObserver(function () {
      ensureTitleObserved();
      scheduleApply();
    });
    // document_start 时 head/body 可能都还不存在，documentElement 一定存在
    const root = document.documentElement || document;
    treeObserver.observe(root, { childList: true, subtree: true, characterData: true });
  }

  /**
   * 定时兜底：检测 URL 变化（隔离世界下捕获站点 pushState）与文本偏离。
   */
  function tick() {
    if (!state.ready || !state.enabled) return;
    if (currentNavKey() !== state.navKey || isOutOfSync()) {
      onNavigate();
    }
  }

  // ---------------------------------------------------------------------------
  // 开关与消息
  // ---------------------------------------------------------------------------

  /**
   * 切换开关状态并立即生效。
   * @param {boolean} enabled
   */
  function setEnabled(enabled) {
    state.enabled = enabled;
    if (enabled) {
      apply();
    } else {
      restore();
    }
  }

  /**
   * 读取开关状态；无 storage API 或读取失败时用默认值。
   * @param {function(boolean): void} done
   */
  function readEnabled(done) {
    const storage = chromeApi('storage');
    if (!storage || !storage.local || typeof storage.local.get !== 'function') {
      done(DEFAULT_ENABLED);
      return;
    }
    let finished = false;
    const finish = function (value) {
      if (finished) return;
      finished = true;
      done(value);
    };
    try {
      storage.local.get(STORAGE_KEY_ENABLED, function (items) {
        const value = items && items[STORAGE_KEY_ENABLED];
        finish(typeof value === 'boolean' ? value : DEFAULT_ENABLED);
      });
    } catch (_) {
      finish(DEFAULT_ENABLED);
    }
  }

  /**
   * 监听 storage 变化，popup 切换开关时实时生效。
   */
  function listenStorage() {
    const storage = chromeApi('storage');
    if (!storage || !storage.onChanged || typeof storage.onChanged.addListener !== 'function') return;
    storage.onChanged.addListener(function (changes, area) {
      if (area !== 'local' || !changes || !changes[STORAGE_KEY_ENABLED]) return;
      const value = changes[STORAGE_KEY_ENABLED].newValue;
      setEnabled(typeof value === 'boolean' ? value : DEFAULT_ENABLED);
    });
  }

  /**
   * 监听 popup 消息：换一个 / 查询当前标题。均同步 sendResponse。
   */
  function listenMessages() {
    const runtime = chromeApi('runtime');
    if (!runtime || !runtime.onMessage || typeof runtime.onMessage.addListener !== 'function') return;
    runtime.onMessage.addListener(function (message, _sender, sendResponse) {
      if (!message || typeof message.type !== 'string') return false;
      if (message.type === MSG_SHUFFLE) {
        pickNewTitle();
        apply();
      } else if (message.type !== MSG_GET_CURRENT) {
        return false;
      }
      sendResponse({
        ok: true,
        title: desiredTitle(),
        enabled: state.enabled,
        poolSize: TITLE_POOL.length
      });
      return false;
    });
  }

  // ---------------------------------------------------------------------------
  // 初始化
  // ---------------------------------------------------------------------------

  /**
   * 初始化流程：读开关 → 钩子 history → 挂 observers → 起 interval → 立即尝试 apply。
   * 读开关是异步的，钩子与观察器先挂上，apply 由 state.ready 守卫。
   */
  function init() {
    state.navKey = currentNavKey();
    pickNewTitle();

    hookHistory();
    observe();
    listenStorage();
    listenMessages();
    setInterval(tick, CHECK_INTERVAL_MS);

    readEnabled(function (enabled) {
      state.enabled = enabled;
      state.ready = true;
      apply();
    });
  }

  init();
})();
