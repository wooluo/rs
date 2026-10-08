/* 高性价比人生指南 · 检索与收藏
   数据：data.js 中的 GUIDE（由 build_data.py 生成，源自 eternity4719/HowToLiveBetter，CC BY 4.0） */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var PAGE = 40; // 每次渲染条数

  /* ---------- 数据索引 ---------- */
  var CH = {};
  GUIDE.chapters.forEach(function (c) { CH[c.id] = c; });
  GUIDE.entries.forEach(function (e) {
    e._chTitle = CH[e.ch].title;
    e._hay = (e.title + '\n' + e.plain + '\n' + e.cost + '\n' + e.benefit + '\n' + e.note + '\n' + e._chTitle).toLowerCase();
  });

  /* ---------- 标签定义 ---------- */
  var FILTER_DEFS = [
    { key: 'ev',    label: '证据',    options: [['A', 'A'], ['B', 'B'], ['C', 'C']] },
    { key: 'money', label: '花钱',    options: [['0', '不花钱'], ['少', '花得少'], ['多', '花得多']] },
    { key: 'time',  label: '费时',    options: [['少', '省时间'], ['中', '中等'], ['多', '费时间']] },
    { key: 'will',  label: '毅力',    options: [['否', '不需要'], ['些', '要一点'], ['是', '必须要']] },
    { key: 'gain',  label: '收益',    options: [['大', '收益大'], ['中', '收益中'], ['小', '收益小']] },
    { key: 'cal',   label: '换回',    options: [['死亡率', '死亡率'], ['时间', '时间'], ['金钱', '金钱'], ['自由', '自由']] }
  ];
  var TAG_TEXT = {
    money: { '0': '不花钱', '少': '花得少', '多': '花得多' },
    time: { '少': '省时间', '中': '中等时间', '多': '费时间' },
    will: { '否': '不需要毅力', '些': '要一点毅力', '是': '需要毅力' },
    gain: { '大': '收益大', '中': '收益中', '小': '收益小' },
    cal: { '死亡率': '换回：死亡率', '时间': '换回：时间', '金钱': '换回：金钱', '自由': '换回：自由' }
  };

  /* ---------- 状态 ---------- */
  var state = { q: '', ch: 0, fav: false, e: '' };
  FILTER_DEFS.forEach(function (d) { state[d.key] = ''; });

  var favs = loadFavs();
  var filtered = [];
  var rendered = 0;
  var highlightKws = [];

  function loadFavs() {
    try {
      var arr = JSON.parse(localStorage.getItem('guide-favs') || '[]');
      return new Set(arr.filter(function (x) { return typeof x === 'string'; }));
    } catch (e) { return new Set(); }
  }
  function saveFavs() {
    localStorage.setItem('guide-favs', JSON.stringify(Array.from(favs)));
  }

  /* ---------- URL hash ---------- */
  function writeHash() {
    var p = [];
    if (state.e) { p.push('e=' + encodeURIComponent(state.e)); }
    else {
      if (state.q) p.push('q=' + encodeURIComponent(state.q));
      if (state.ch) p.push('ch=' + state.ch);
      if (state.fav) p.push('fav=1');
      FILTER_DEFS.forEach(function (d) { if (state[d.key]) p.push(d.key + '=' + encodeURIComponent(state[d.key])); });
    }
    var h = p.length ? '#' + p.join('&') : '#';
    history.replaceState(null, '', location.pathname + h);
  }
  function readHash() {
    if (!location.hash || location.hash === '#') return;
    var params = new URLSearchParams(location.hash.slice(1));
    state.q = params.get('q') || '';
    state.ch = parseInt(params.get('ch') || '0', 10) || 0;
    state.fav = params.get('fav') === '1';
    state.e = (params.get('e') || '').trim();
    FILTER_DEFS.forEach(function (d) { state[d.key] = params.get(d.key) || ''; });
  }
  // 直达条目（#e=1-7）与其他视图互斥；用户一操作就退出直达模式
  function clearDeepLink() { state.e = ''; }

  /* ---------- HTML 工具 ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // 尖括号与裸链接 → <a>；**粗体** → <strong>
  function richText(s) {
    return esc(s)
      .replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/(?<!["'=])(https?:\/\/[^\s<>()（）。，；]+)/g,
        '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }
  // 关键词高亮（不做链接，避免破坏 href）
  function hlText(s, kws) {
    if (!kws.length) return esc(s);
    var lower = s.toLowerCase(), ranges = [];
    kws.forEach(function (k) {
      var i = 0;
      while ((i = lower.indexOf(k, i)) !== -1) { ranges.push([i, i + k.length]); i += k.length; }
    });
    if (!ranges.length) return esc(s);
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [ranges[0]];
    ranges.slice(1).forEach(function (r) {
      var last = merged[merged.length - 1];
      if (r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push(r);
    });
    var out = '', pos = 0;
    merged.forEach(function (r) {
      out += esc(s.slice(pos, r[0])) + '<mark>' + esc(s.slice(r[0], r[1])) + '</mark>';
      pos = r[1];
    });
    return out + esc(s.slice(pos));
  }

  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.hidden = true; }, 1800);
  }

  /* ---------- 过滤 ---------- */
  function applyFilter() {
    var kws = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    highlightKws = kws;
    if (state.e) {
      filtered = GUIDE.entries.filter(function (x) { return x.id === state.e; });
      return;
    }
    filtered = GUIDE.entries.filter(function (e) {
      if (state.fav && !favs.has(e.id)) return false;
      if (state.ch && e.ch !== state.ch) return false;
      var i;
      for (i = 0; i < FILTER_DEFS.length; i++) {
        var k = FILTER_DEFS[i].key;
        if (state[k] && e[k] !== state[k]) return false;
      }
      for (i = 0; i < kws.length; i++) {
        if (e._hay.indexOf(kws[i]) === -1) return false;
      }
      return true;
    });
  }

  /* ---------- 渲染 ---------- */
  function cardHTML(e) {
    var tags = [];
    ['money', 'time', 'will', 'gain', 'cal'].forEach(function (k) {
      if (e[k] && TAG_TEXT[k][e[k]]) {
        var cls = k === 'gain' ? 'tag gain-' + e[k] : 'tag';
        tags.push('<span class="' + cls + '">' + TAG_TEXT[k][e[k]] + '</span>');
      }
    });
    var evTip = e.evNote ? ' title="证据等级：' + esc(e.evNote) + '"' : '';
    return (
      '<article class="card" id="e-' + e.id + '" data-id="' + e.id + '">' +
        '<div class="card-meta">' +
          '<span class="ev ev-' + e.ev + '"' + evTip + '>证据 ' + e.ev + '</span>' +
          '<span class="card-ch" data-ch="' + e.ch + '" title="只看本章">第' + e.ch + '章 · 第' + e.no + '条</span>' +
          '<button class="share-btn" data-share="' + e.id + '" title="分享这一条">🔗</button>' +
          '<button class="star-btn' + (favs.has(e.id) ? ' on' : '') + '" data-star="' + e.id + '" title="收藏 / 取消收藏">' + (favs.has(e.id) ? '★' : '☆') + '</button>' +
        '</div>' +
        '<h3>' + hlText(e.title, highlightKws) + '</h3>' +
        (tags.length ? '<div class="tags">' + tags.join('') + '</div>' : '') +
        '<p class="plain">' + hlText(e.plain, highlightKws) + '</p>' +
        '<p class="cost-line"><b>成本</b> ｜ ' + richText(e.cost) + '</p>' +
        '<details><summary>展开：收益详情 · 来源 · 备注 ▾</summary>' +
          '<div class="detail-grid">' +
            '<div class="dfield"><span class="dlabel">收益</span><div class="dbody">' + richText(e.benefit) + '</div></div>' +
            '<div class="dfield"><span class="dlabel">来源' + (e.evNote ? '（证据 ' + esc(e.evNote) + '）' : '') + '</span><div class="dbody">' + richText(e.source) + '</div></div>' +
            '<div class="dfield"><span class="dlabel">备注</span><div class="dbody">' + richText(e.note) + '</div></div>' +
          '</div>' +
        '</details>' +
      '</article>'
    );
  }

  function renderList(reset) {
    var list = $('#list');
    if (reset) { rendered = 0; list.innerHTML = ''; }
    var end = Math.min(rendered + PAGE, filtered.length);
    var html = '';
    for (var i = rendered; i < end; i++) html += cardHTML(filtered[i]);
    list.insertAdjacentHTML('beforeend', html);
    rendered = end;
    $('#moreBtn').hidden = rendered >= filtered.length;
    var empty = filtered.length === 0;
    $('#empty').hidden = !empty;
    if (empty) {
      $('#emptyMsg').textContent = state.e
        ? '链接指向的条目不存在，可能已在上游更新中移除。'
        : (state.fav && !state.q && !state.ch && !anyFilter()
          ? '还没有收藏。点击条目右侧的 ☆ 就能收藏它。'
          : '没有匹配的条目，换个关键词或放宽筛选试试。');
    }
    updateStats();
  }

  function updateStats() {
    var extra = [];
    if (state.e) {
      var de = GUIDE.entries.find(function (x) { return x.id === state.e; });
      extra.push(de ? ('直达：第' + de.ch + '章 · 第' + de.no + '条') : '直达条目不存在');
    } else {
      if (state.q) extra.push('搜「' + state.q + '」');
      if (state.fav) extra.push('收藏');
    }
    $('#stats').innerHTML = '显示 <b>' + rendered + '</b> / ' + filtered.length + ' 条' +
      (extra.length ? '（' + esc(extra.join(' · ')) + '）' : '');
    var active = 0;
    FILTER_DEFS.forEach(function (d) { if (state[d.key]) active++; });
    $('#filterHint').textContent = active ? ('已设 ' + active + ' 项') : '';
  }

  function anyFilter() {
    return FILTER_DEFS.some(function (d) { return !!state[d.key]; });
  }

  function refresh(resetList) {
    applyFilter();
    renderList(resetList !== false);
    renderChapterIntro();
    writeHash();
    syncControls();
  }

  /* ---------- 章节侧栏 ---------- */
  function renderChapterNav() {
    var counts = {};
    GUIDE.entries.forEach(function (e) { counts[e.ch] = (counts[e.ch] || 0) + 1; });
    var nav = $('#chapterNav');
    var html = chapterLink(0, '', '全部', GUIDE.entries.length);
    GUIDE.chapters.forEach(function (c) {
      html += chapterLink(c.id, c.id + '. ', c.title, counts[c.id] || 0);
    });
    nav.innerHTML = html;

    var sel = $('#chSelect');
    sel.innerHTML = '<option value="0">全部章节</option>' + GUIDE.chapters.map(function (c) {
      return '<option value="' + c.id + '">' + c.id + '. ' + esc(c.title) + '</option>';
    }).join('');
  }
  function chapterLink(id, prefix, title, count) {
    return '<button class="ch-link' + (state.ch === id ? ' active' : '') + '" data-chbtn="' + id + '">' +
      '<span class="ch-no">' + prefix + '</span><span>' + esc(title) + '</span>' +
      '<span class="ch-count">' + count + '</span></button>';
  }

  function renderChapterIntro() {
    var box = $('#chIntro');
    if (state.ch && !state.e && !state.q && !state.fav && !anyFilter()) {
      var c = CH[state.ch];
      $('#chIntroBody').textContent = c.intro;
      box.hidden = false;
      box.open = false;
    } else {
      box.hidden = true;
    }
  }

  /* ---------- 控件同步 ---------- */
  function syncControls() {
    $('#q').value = state.q;
    $('#qClear').style.display = state.q ? 'block' : 'none';
    $('#favBtn').classList.toggle('active', state.fav);
    $('#chSelect').value = String(state.ch);
    document.querySelectorAll('[data-chbtn]').forEach(function (b) {
      b.classList.toggle('active', parseInt(b.dataset.chbtn, 10) === state.ch);
    });
    document.querySelectorAll('.chip').forEach(function (c) {
      c.classList.toggle('on', state[c.dataset.key] === c.dataset.val);
    });
  }

  /* ---------- 事件 ---------- */
  function bind() {
    // 搜索：即时 + 防抖
    var timer = null;
    $('#q').addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.q = $('#q').value;
        clearDeepLink();
        refresh();
      }, 160);
    });
    $('#qClear').addEventListener('click', function () {
      $('#q').value = ''; state.q = ''; clearDeepLink(); refresh();
      $('#q').focus();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === '/' && document.activeElement !== $('#q')) {
        ev.preventDefault(); $('#q').focus(); $('#q').select();
      }
      if (ev.key === 'Escape') {
        hideSharePop();
        hideImgModal();
        if (document.activeElement === $('#q')) {
          $('#q').value = ''; state.q = ''; clearDeepLink(); refresh();
        }
      }
    });

    // 收藏按钮（切换只看收藏）
    $('#favBtn').addEventListener('click', function () {
      state.fav = !state.fav;
      clearDeepLink();
      refresh();
      if (state.fav && favs.size === 0) toast('还没有收藏，先点条目右侧的 ☆ 吧');
    });

    // 卡片星标（事件委托）
    $('#list').addEventListener('click', function (ev) {
      var star = ev.target.closest('[data-star]');
      if (star) {
        var id = star.dataset.star;
        if (favs.has(id)) {
          favs.delete(id);
          toast('已取消收藏');
        } else {
          favs.add(id);
          toast('已收藏 ★');
        }
        saveFavs();
        updateFavCount();
        if (state.fav) { refresh(); } // 收藏视图里实时移除
        else {
          var btn = document.querySelector('[data-star="' + id + '"]');
          if (btn) { btn.classList.toggle('on', favs.has(id)); btn.textContent = favs.has(id) ? '★' : '☆'; }
        }
        return;
      }
      var ch = ev.target.closest('[data-ch]');
      if (ch) {
        state.ch = parseInt(ch.dataset.ch, 10);
        clearDeepLink();
        window.scrollTo({ top: 0 });
        refresh();
      }
      var sh = ev.target.closest('[data-share]');
      if (sh) { showSharePop(sh, sh.dataset.share); }
    });

    // 章节导航
    $('#chapterNav').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-chbtn]');
      if (!b) return;
      state.ch = parseInt(b.dataset.chbtn, 10);
      clearDeepLink();
      window.scrollTo({ top: 0 });
      refresh();
    });
    $('#chSelect').addEventListener('change', function () {
      state.ch = parseInt(this.value, 10);
      clearDeepLink();
      refresh();
    });

    // 筛选 chips
    $('#filterGroups').addEventListener('click', function (ev) {
      var c = ev.target.closest('.chip');
      if (!c) return;
      var k = c.dataset.key, v = c.dataset.val;
      state[k] = state[k] === v ? '' : v;
      clearDeepLink();
      refresh();
    });

    // 分页：按钮 + 滚动到底自动加载
    $('#moreBtn').addEventListener('click', function () { renderList(false); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting && rendered < filtered.length) renderList(false);
      }, { rootMargin: '600px' }).observe($('#sentinel'));
    }

    // 随机一条
    $('#randomBtn').addEventListener('click', function () {
      if (!filtered.length) return;
      var idx = Math.floor(Math.random() * filtered.length);
      while (rendered <= idx) renderList(false); // 确保目标卡片已渲染
      var card = document.getElementById('e-' + filtered[idx].id);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
      }
    });

    // 导出收藏
    $('#exportBtn').addEventListener('click', exportFavs);

    // 分享本页（当前视图）
    $('#pageShareBtn').addEventListener('click', function () {
      var url = location.href;
      if (location.protocol !== 'http:' && location.protocol !== 'https:') {
        toast('当前以 file:// 打开，没有可分享的链接。用本地服务器或部署后即可分享');
        return;
      }
      if (navigator.share) {
        navigator.share({ title: '高性价比人生指南', url: url }).catch(function () {});
      } else {
        copyText(url).then(function (ok) {
          toast(ok ? '当前页面链接已复制，对方打开就是你看到的筛选结果' : '复制失败，请手动复制地址栏');
        });
      }
    });

    // 分享图片弹窗
    $('#imgClose').addEventListener('click', hideImgModal);
    $('#imgModal').addEventListener('click', function (ev) { if (ev.target === this) hideImgModal(); });

    // 条目分享菜单
    bindSharePop();

    // 清空
    $('#resetBtn').addEventListener('click', resetAll);
  }

  function resetAll() {
    state.q = ''; state.ch = 0; state.fav = false;
    clearDeepLink();
    FILTER_DEFS.forEach(function (d) { state[d.key] = ''; });
    $('#q').value = '';
    refresh();
  }

  function updateFavCount() {
    $('#favCount').textContent = favs.size;
  }

  /* ---------- 导出收藏 ---------- */
  function exportFavs() {
    var list = GUIDE.entries.filter(function (e) { return favs.has(e.id); });
    if (!list.length) { toast('还没有收藏可导出'); return; }
    var lines = ['# 我的收藏 · 高性价比人生指南', '',
      '> 共 ' + list.length + ' 条 · 导出自本地检索页 · 内容来源 HowToLiveBetter（CC BY 4.0）', ''];
    var byCh = {};
    list.forEach(function (e) { (byCh[e.ch] = byCh[e.ch] || []).push(e); });
    Object.keys(byCh).map(Number).sort(function (a, b) { return a - b; }).forEach(function (chId) {
      lines.push('## 第' + chId + '章 · ' + CH[chId].title);
      lines.push('');
      byCh[chId].forEach(function (e) {
        lines.push('### ' + e.no + '. ' + e.title);
        lines.push('- 证据等级：' + e.ev + (e.evNote ? '（' + e.evNote + '）' : ''));
        lines.push('- 成本：' + e.cost);
        lines.push('- 说人话：' + e.plain);
        lines.push('- 收益：' + e.benefit);
        lines.push('- 来源：' + e.source);
        lines.push('- 备注：' + e.note);
        lines.push('');
      });
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '高性价比人生指南-我的收藏.md';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('已导出 ' + list.length + ' 条收藏');
  }

  /* ---------- 分享 ---------- */
  var FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif';

  function pageUrl() {
    // http(s) 下返回可分享的地址；file:// 打开时没有可访问的链接，退回提示文字
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      return location.origin + location.pathname;
    }
    return '';
  }
  function entryUrl(e) { var b = pageUrl(); return b ? b + '#e=' + e.id : ''; }
  function entryShareText(e) {
    var url = entryUrl(e);
    return '【高性价比人生指南】第' + e.ch + '章 · 第' + e.no + '条\n' + e.title + '\n\n' +
      e.plain + '\n\n证据等级 ' + e.ev + ' ｜ 来源：HowToLiveBetter' +
      (url ? '\n' + url : '');
  }

  function copyText(text) {
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; },
        function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }

  /* ---- 条目分享弹出菜单 ---- */
  var popEntry = null;
  function showSharePop(btn, id) {
    popEntry = GUIDE.entries.find(function (x) { return x.id === id; }) || null;
    var pop = $('#sharePop');
    if (!popEntry) return;
    $('#sharePopTitle').textContent = '第' + popEntry.ch + '章 · 第' + popEntry.no + '条 ｜ ' + popEntry.title;
    $('#shareSysBtn').hidden = !navigator.share;
    pop.hidden = false;
    var r = btn.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    var left = Math.min(Math.max(8, r.right - pr.width), innerWidth - pr.width - 8);
    var top = r.bottom + 8 + pr.height > innerHeight ? r.top - pr.height - 8 : r.bottom + 8;
    pop.style.left = left + 'px';
    pop.style.top = Math.max(8, top) + 'px';
  }
  function hideSharePop() { $('#sharePop').hidden = true; }
  document.addEventListener('click', function (ev) {
    var pop = $('#sharePop');
    if (!pop.hidden && !pop.contains(ev.target) && !ev.target.closest('[data-share]')) hideSharePop();
  });

  function bindSharePop() {
    $('#sharePop').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]');
      if (!b || !popEntry) return;
      var entry = popEntry, url = entryUrl(entry);
      hideSharePop();
      var act = b.dataset.act;
      if (act === 'link') {
        if (!url) { toast('当前以 file:// 打开，没有可分享的链接。用本地服务器或部署后即可分享'); return; }
        copyText(url).then(function (ok) {
          toast(ok ? '链接已复制，发给对方打开就是这一条' : '复制失败，请手动复制地址栏链接');
        });
      } else if (act === 'text') {
        copyText(entryShareText(entry)).then(function (ok) {
          toast(ok ? '文字已复制，可直接粘贴到聊天里' : '复制失败');
        });
      } else if (act === 'img') {
        openShareImage(entry);
      } else if (act === 'sys') {
        if (navigator.share) {
          navigator.share({ title: entry.title, text: entry.plain.slice(0, 80), url: url || undefined })
            .catch(function () {});
        }
      }
    });
  }

  /* ---- 分享图片（Canvas 生成） ---- */
  function wrapText(ctx, text, maxW) {
    var out = [];
    String(text).split('\n').forEach(function (par) {
      var line = '';
      for (var i = 0; i < par.length; i++) {
        var ch = par[i];
        if (ctx.measureText(line + ch).width > maxW && line) {
          var cjk = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]/.test(ch);
          if (!cjk) { // 英文单词尽量不切断，在最近的空格断行
            var sp = line.lastIndexOf(' ');
            if (sp > 0) { out.push(line.slice(0, sp)); line = line.slice(sp + 1) + ch; continue; }
          }
          out.push(line); line = ch;
        } else { line += ch; }
      }
      out.push(line);
    });
    return out;
  }
  function rr(ctx, x, y, w, h, r) { // 圆角矩形路径
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  var EV_COLOR = { A: ['#15803d', '#dcfce7'], B: ['#b45309', '#fef3c7'], C: ['#57534e', '#e7e5e4'] };

  function makeShareImage(e) {
    var W = 1080, margin = 48, pad = 56;
    var innerW = W - 2 * margin - 2 * pad;
    var cv = document.createElement('canvas');
    var ctx = cv.getContext('2d');
    var i;

    // 文本排版计算
    ctx.font = '700 56px ' + FONT;
    var titleLines = wrapText(ctx, e.title, innerW);
    ctx.font = '400 38px ' + FONT;
    var plain = e.plain.length > 420 ? e.plain.slice(0, 420) + '……' : e.plain;
    var bodyLines = wrapText(ctx, plain, innerW).slice(0, 14);
    var tagList = [];
    ['money', 'time', 'will', 'gain'].forEach(function (k) {
      if (e[k] && TAG_TEXT[k][e[k]]) tagList.push(TAG_TEXT[k][e[k]]);
    });
    tagList.push('证据 ' + e.ev);
    ctx.font = '500 28px ' + FONT;
    var tagW = tagList.map(function (t) { return ctx.measureText(t).width + 44; });

    var titleLH = 78, bodyLH = 62;
    var y = margin + pad;                              // 卡片内起点
    y += 48 + 34;                                      // 品牌行 + 间距
    y += 34 + 22;                                      // 章节行 + 间距
    y += titleLines.length * titleLH + 26;             // 标题
    y += 46 + 22;                                      // 「说人话」标签 + 间距
    y += bodyLines.length * bodyLH + 34;               // 正文
    var tagRowsW = 0, tagH = 54, tagRows = 1;          // 标签行数
    for (i = 0; i < tagW.length; i++) {
      if (tagRowsW + tagW[i] > innerW) { tagRows++; tagRowsW = tagW[i]; }
      else tagRowsW += tagW[i] + 14;
    }
    y += tagRows * tagH + (tagRows - 1) * 14 + 40;
    y += 1 + 26;                                       // 分隔线
    y += 40 + 40;                                      // 页脚两行
    var H = y + pad + margin;
    cv.width = W; cv.height = H;

    // 背景 + 卡片
    ctx.fillStyle = '#f0ede5';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.shadowColor = 'rgba(60,50,30,.20)';
    ctx.shadowBlur = 36; ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#ffffff';
    rr(ctx, margin, margin, W - 2 * margin, H - 2 * margin, 32);
    ctx.fill();
    ctx.restore();

    var x0 = margin + pad;
    y = margin + pad;

    // 品牌行
    ctx.fillStyle = '#0d7d72';
    rr(ctx, x0, y, 340, 48, 24); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px ' + FONT;
    ctx.textBaseline = 'middle';
    ctx.fillText('高性价比人生指南', x0 + 24, y + 25);
    var evc = EV_COLOR[e.ev] || EV_COLOR.C;
    var evText = '证据 ' + e.ev, evW = ctx.measureText(evText).width + 44;
    ctx.fillStyle = evc[1];
    rr(ctx, x0 + innerW - evW, y, evW, 48, 24); ctx.fill();
    ctx.fillStyle = evc[0];
    ctx.font = '700 28px ' + FONT;
    ctx.fillText(evText, x0 + innerW - evW + 22, y + 25);
    y += 48 + 34;

    // 章节行
    ctx.fillStyle = '#8a8f98';
    ctx.font = '500 32px ' + FONT;
    ctx.fillText('第' + e.ch + '章 · 第' + e.no + '条 · ' + e._chTitle, x0, y + 16, innerW);
    y += 34 + 22;

    // 标题
    ctx.fillStyle = '#1f2937';
    ctx.font = '700 56px ' + FONT;
    ctx.textBaseline = 'alphabetic';
    for (i = 0; i < titleLines.length; i++) { ctx.fillText(titleLines[i], x0, y + 52); y += titleLH; }
    y += 26;

    // 「说人话」标签
    ctx.fillStyle = '#e3f2ef';
    rr(ctx, x0, y, 132, 46, 23); ctx.fill();
    ctx.fillStyle = '#0d7d72';
    ctx.font = '600 26px ' + FONT;
    ctx.textBaseline = 'middle';
    ctx.fillText('说人话', x0 + 28, y + 24);
    y += 46 + 22;

    // 正文
    ctx.fillStyle = '#414b57';
    ctx.font = '400 38px ' + FONT;
    for (i = 0; i < bodyLines.length; i++) { ctx.fillText(bodyLines[i], x0, y + 20); y += bodyLH; }
    y += 34;

    // 标签 chips
    ctx.font = '500 28px ' + FONT;
    var tx = x0;
    for (i = 0; i < tagList.length; i++) {
      if (tx + tagW[i] > x0 + innerW) { tx = x0; y += tagH + 14; }
      ctx.fillStyle = '#f6f4ef';
      rr(ctx, tx, y, tagW[i], tagH, 27); ctx.fill();
      ctx.strokeStyle = '#e5e1d8'; ctx.lineWidth = 2;
      rr(ctx, tx, y, tagW[i], tagH, 27); ctx.stroke();
      ctx.fillStyle = '#4b5563';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagList[i], tx + 22, y + tagH / 2 + 1);
      tx += tagW[i] + 14;
    }
    y += tagH + 40;

    // 页脚
    ctx.strokeStyle = '#e5e1d8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + innerW, y); ctx.stroke();
    y += 26 + 20;
    ctx.fillStyle = '#8a8f98';
    ctx.font = '400 26px ' + FONT;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('内容来源：HowToLiveBetter（CC BY 4.0）· 本图由检索页生成', x0, y);
    y += 40;
    var foot2 = pageUrl() ? (pageUrl() + '#e=' + e.id) : '长寿防病 · 省钱理财 · 法律红线 · 婚育育儿';
    ctx.fillStyle = '#0d7d72';
    ctx.fillText(foot2, x0, y);
    return cv;
  }

  /* ---- 图片预览弹窗 ---- */
  var imgBlobUrl = null, imgFileName = '';
  function openShareImage(entry) {
    var cv = makeShareImage(entry);
    var dataUrl = cv.toDataURL('image/png');
    imgFileName = '指南-第' + entry.ch + '章第' + entry.no + '条.png';
    $('#imgPreview').src = dataUrl;
    $('#imgShare').hidden = true;
    $('#imgModal').hidden = false;
    cv.toBlob(function (blob) {
      if (!blob) return;
      if (imgBlobUrl) URL.revokeObjectURL(imgBlobUrl);
      imgBlobUrl = URL.createObjectURL(blob);
      var a = $('#imgDownload');
      a.href = imgBlobUrl;
      a.download = imgFileName;
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], imgFileName, { type: 'image/png' })] })) {
        var sb = $('#imgShare');
        sb.hidden = false;
        sb.onclick = function () {
          navigator.share({
            files: [new File([blob], imgFileName, { type: 'image/png' })],
            title: entry.title
          }).catch(function () {});
        };
      }
    }, 'image/png');
  }
  function hideImgModal() {
    if ($('#imgModal').hidden) return;
    $('#imgModal').hidden = true;
  }

  /* ---------- 启动 ---------- */
  function initFilterGroups() {
    var html = FILTER_DEFS.map(function (d) {
      var chips = d.options.map(function (o) {
        return '<button class="chip' + (d.key === 'ev' ? ' ev-' + o[0] : '') + '" data-key="' + d.key + '" data-val="' + o[0] + '">' + o[1] + '</button>';
      }).join('');
      return '<div class="fgroup"><span class="fgroup-label">' + d.label + '</span>' + chips + '</div>';
    }).join('');
    $('#filterGroups').innerHTML = html;
  }

  readHash();
  // 页面已加载时，通过链接/地址栏改 hash 也能同步视图（writeHash 用 replaceState，不会触发此事件，无循环）
  window.addEventListener('hashchange', function () {
    state.q = ''; state.ch = 0; state.fav = false;
    clearDeepLink();
    FILTER_DEFS.forEach(function (d) { state[d.key] = ''; });
    readHash();
    refresh();
    flashDeepLink();
  });
  initFilterGroups();
  renderChapterNav();
  $('#totalCount').textContent = GUIDE.entries.length;
  updateFavCount();
  bind();
  refresh();
  flashDeepLink();

  function flashDeepLink() {
    if (!state.e) return;
    var card = document.getElementById('e-' + state.e);
    if (card) {
      card.scrollIntoView({ block: 'center' });
      card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
    }
  }
})();
