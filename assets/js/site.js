/* ==========================================================================
   AI一起成长营 · 站点交互（原生 JS，无任何外部依赖）
   功能：移动端菜单、FAQ 折叠、复制提示词、当前页导航高亮、年份
   本地双击 file:// 打开同样可用。
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(sel));
  };

  /* ---------- 1. 当前页导航高亮 ---------- */
  var page = document.body.getAttribute('data-page');
  if (page) {
    $$('.site-nav a[data-nav]').forEach(function (link) {
      if (link.getAttribute('data-nav') === page) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ---------- 2. 移动端菜单 ---------- */
  var toggle = $('.nav-toggle');
  var nav = $('#site-nav');

  function isDesktop() {
    return window.matchMedia('(min-width: 1024px)').matches;
  }

  function closeNav() {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      if (open) {
        closeNav();
        return;
      }
      toggle.setAttribute('aria-expanded', 'true');
      nav.classList.add('is-open');
      document.body.classList.add('nav-open');
    });

    // 点击导航链接后自动收起（移动端）
    $$('a', nav).forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    // 点击菜单外部收起
    document.addEventListener('click', function (e) {
      if (isDesktop() || !nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      closeNav();
    });

    // Esc 收起并把焦点还给按钮
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        closeNav();
        toggle.focus();
      }
    });

    // 切到桌面宽度时复位，避免残留遮罩状态
    var mq = window.matchMedia('(min-width: 1024px)');
    var onChange = function (e) { if (e.matches) closeNav(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* ---------- 3. FAQ 折叠 ---------- */
  var faqButtons = $$('.faq-q');
  faqButtons.forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    // 初始全部收起（HTML 里除首条外也可保持收起，保持一致行为）
    var expanded = btn.getAttribute('aria-expanded') === 'true';
    panel.hidden = !expanded;
    if (expanded) panel.removeAttribute('hidden');
    else panel.hidden = true;

    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      // 手风琴：先收起同组其他项
      var group = btn.closest('.faq');
      if (group && !isOpen) {
        $$('.faq-q[aria-expanded="true"]', group).forEach(function (other) {
          if (other === btn) return;
          var otherPanel = document.getElementById(other.getAttribute('aria-controls'));
          other.setAttribute('aria-expanded', 'false');
          if (otherPanel) otherPanel.hidden = true;
        });
      }
      btn.setAttribute('aria-expanded', String(!isOpen));
      if (isOpen) {
        panel.hidden = true;
      } else {
        panel.hidden = false;
      }
    });
  });

  /* ---------- 4. 复制提示词 ---------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('execCommand copy failed'));
      } catch (err) {
        reject(err);
      }
    });
  }

  var COPY_LABEL = '复制提示词';
  var COPIED_LABEL = '已复制 ✓';
  var FAIL_LABEL = '请选中文字手动复制';

  $$('.copy-btn').forEach(function (btn) {
    var box = btn.closest('.prompt-box');
    var code = box ? $('pre code', box) : null;
    if (!code) return;
    var original = btn.querySelector('.copy-btn-label');
    var timer = null;

    function reset() {
      if (original) original.textContent = COPY_LABEL;
      btn.classList.remove('is-done');
    }

    btn.addEventListener('click', function () {
      var text = code.innerText || code.textContent || '';
      copyText(text).then(function () {
        if (original) original.textContent = COPIED_LABEL;
        btn.classList.add('is-done');
        if (timer) clearTimeout(timer);
        timer = setTimeout(reset, 2200);
      }).catch(function () {
        if (original) original.textContent = FAIL_LABEL;
        if (timer) clearTimeout(timer);
        timer = setTimeout(reset, 3000);
      });
    });
  });

  /* ---------- 5. 内容区 tab 切换（骨架版：社群动态等） ---------- */
  $$('.tabs').forEach(function (tablist) {
    var tabs = $$('.tab', tablist);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (other) {
          other.setAttribute('aria-selected', 'false');
          other.tabIndex = -1;
          var otherPanel = document.getElementById(other.getAttribute('aria-controls'));
          if (otherPanel) otherPanel.hidden = true;
        });
        tab.setAttribute('aria-selected', 'true');
        tab.tabIndex = 0;
        var panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) panel.hidden = false;
      });
      // 方向键切换，保证键盘可用
      tab.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var idx = tabs.indexOf(tab);
        var next = e.key === 'ArrowRight' ? tabs[(idx + 1) % tabs.length] : tabs[(idx - 1 + tabs.length) % tabs.length];
        next.focus();
        next.click();
      });
    });
  });

  /* ---------- 6. 页脚年份 ---------- */
  $$('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
