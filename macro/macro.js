// Painel macro: lê /macro/data.json (gerado por scripts/fetch_macro.py) e desenha os cards.
(function () {
  'use strict';

  var LANG = document.documentElement.lang.indexOf('pt') === 0 ? 'pt' : 'en';
  var LOCALE = LANG === 'pt' ? 'pt-BR' : 'en-US';
  var SVG = 'http://www.w3.org/2000/svg';

  var T = {
    pt: {
      selic: ['Selic (meta)', '% a.a.', 'Meta definida pelo Copom.'],
      cdi: ['CDI', '% a.a.', 'Taxa diária anualizada: (1 + taxa diária)^252 − 1.'],
      ipca12: ['IPCA 12 meses', '%', 'Inflação acumulada nos últimos 12 meses.'],
      real: ['Juro real', '% a.a.', '(1 + Selic no fim do mês) ÷ (1 + IPCA 12 meses) − 1.'],
      ptax: ['Dólar PTAX', 'R$', 'Cotação de venda do dólar comercial.'],
      vs12: 'em 12 meses',
      noChange: 'estável em 12 meses',
      pp: 'p.p.',
      series: 'série',
      updated: 'Dados atualizados em',
      error: 'Não foi possível carregar os dados agora. Tente de novo em alguns minutos.',
      month: 'Mês',
      chart: 'Gráfico de',
    },
    en: {
      selic: ['Selic (target)', '% p.a.', 'Target rate set by Copom, the central bank’s monetary policy committee.'],
      cdi: ['CDI', '% p.a.', 'Daily interbank rate, annualized: (1 + daily rate)^252 − 1.'],
      ipca12: ['IPCA, 12 months', '%', 'Consumer inflation over the last 12 months.'],
      real: ['Real interest rate', '% p.a.', '(1 + Selic at month end) ÷ (1 + 12-month IPCA) − 1.'],
      ptax: ['USD/BRL (PTAX)', 'R$', 'Official selling rate for the US dollar.'],
      vs12: 'over 12 months',
      noChange: 'flat over 12 months',
      pp: 'pp',
      series: 'series',
      updated: 'Data updated on',
      error: 'Could not load the data right now. Please try again in a few minutes.',
      month: 'Month',
      chart: 'Chart of',
    },
  }[LANG];

  // decimais no destaque, decimais no detalhe, variação em p.p. ou em %, desenho em degraus
  var INDICATORS = [
    { key: 'selic', dec: 2, tipDec: 2, delta: 'pp', step: true },
    { key: 'cdi', dec: 2, tipDec: 2, delta: 'pp', step: true },
    { key: 'ipca12', dec: 2, tipDec: 2, delta: 'pp', monthly: true },
    { key: 'real', dec: 2, tipDec: 2, delta: 'pp', monthly: true },
    { key: 'ptax', dec: 2, tipDec: 4, delta: 'pct', currency: true },
  ];

  var data = null;
  var years = 2;
  var root = document.getElementById('macro');
  var grid = root.querySelector('.macro-grid');
  var tableBody = root.querySelector('tbody');
  var tableHead = root.querySelector('thead tr');

  function num(v, dec) {
    return v.toLocaleString(LOCALE, { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function fmtValue(ind, v, dec) {
    var unit = T[ind.key][1];
    if (ind.currency) return unit + ' ' + num(v, dec);
    return num(v, dec) + unit; // "13,75% a.a.", "4,58%"
  }
  function parseDay(s) {
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function fmtDate(s, monthly) {
    var opts = monthly ? { month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' };
    return parseDay(s).toLocaleDateString(LOCALE, opts);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVG, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function cutoff(points, nYears) {
    var last = parseDay(points[points.length - 1][0]);
    var start = new Date(last.getFullYear() - nYears, last.getMonth(), last.getDate());
    return start;
  }
  function inRange(points) {
    var start = cutoff(points, years);
    return points.filter(function (p) { return parseDay(p[0]) >= start; });
  }
  function valueAt(points, day) {
    // último ponto em ou antes de `day`
    var found = null;
    for (var i = 0; i < points.length; i++) {
      if (parseDay(points[i][0]) <= day) found = points[i];
      else break;
    }
    return found;
  }

  function niceTicks(min, max, count) {
    var span = max - min || Math.abs(max) || 1;
    var step = Math.pow(10, Math.floor(Math.log10(span / count)));
    var err = span / count / step;
    if (err >= 7.5) step *= 10;
    else if (err >= 3.5) step *= 5;
    else if (err >= 1.5) step *= 2;
    var ticks = [];
    for (var t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) ticks.push(+t.toFixed(10));
    return { ticks: ticks, step: step };
  }

  function drawChart(card, ind, points) {
    var box = card.querySelector('.macro-chart');
    box.textContent = '';
    var W = Math.max(box.clientWidth, 240), H = 150;
    var pad = { l: 44, r: 12, t: 10, b: 24 };
    var vals = points.map(function (p) { return p[1]; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var margin = (hi - lo) * 0.12 || Math.abs(hi) * 0.05 || 1;
    var nt = niceTicks(lo - margin, hi + margin, 3);
    // o eixo começa e termina em valores redondos, com rótulo
    var y0 = Math.floor((lo - margin * 0.5) / nt.step) * nt.step;
    var y1 = Math.ceil((hi + margin * 0.5) / nt.step) * nt.step;
    nt.ticks = [];
    for (var tv = y0; tv <= y1 + nt.step * 1e-9; tv += nt.step) nt.ticks.push(+tv.toFixed(10));
    var t0 = parseDay(points[0][0]).getTime(), t1 = parseDay(points[points.length - 1][0]).getTime();
    var xs = function (s) { return pad.l + ((parseDay(s).getTime() - t0) / (t1 - t0 || 1)) * (W - pad.l - pad.r); };
    var ys = function (v) { return pad.t + (1 - (v - y0) / (y1 - y0 || 1)) * (H - pad.t - pad.b); };

    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', tabindex: '0' });
    svg.setAttribute('aria-label', T.chart + ' ' + T[ind.key][0]);

    nt.ticks.forEach(function (t) {
      if (t < y0 - 1e-9 || t > y1 + 1e-9) return;
      var y = ys(t);
      svg.appendChild(svgEl('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y, class: t === 0 ? 'zero' : 'grid' }));
      var label = svgEl('text', { x: pad.l - 8, y: y + 4, class: 'tick', 'text-anchor': 'end' });
      label.textContent = num(t, nt.step < 0.1 ? 2 : nt.step < 1 ? 1 : 0);
      svg.appendChild(label);
    });

    // anos no eixo x
    var firstYear = parseDay(points[0][0]).getFullYear() + 1, lastYear = parseDay(points[points.length - 1][0]).getFullYear();
    for (var yr = firstYear; yr <= lastYear; yr++) {
      var x = xs(yr + '-01-01');
      var tx = svgEl('text', { x: x, y: H - 6, class: 'tick', 'text-anchor': 'middle' });
      tx.textContent = String(yr);
      svg.appendChild(tx);
      svg.appendChild(svgEl('line', { x1: x, x2: x, y1: H - pad.b, y2: H - pad.b + 4, class: 'grid' }));
    }

    var d = '';
    points.forEach(function (p, i) {
      var x = xs(p[0]).toFixed(1), y = ys(p[1]).toFixed(1);
      if (i === 0) d = 'M' + x + ',' + y;
      else if (ind.step) d += 'H' + x + 'V' + y;
      else d += 'L' + x + ',' + y;
    });
    var base = ys(Math.max(y0, Math.min(0, y1)));
    svg.appendChild(svgEl('path', { d: d + 'V' + base + 'H' + xs(points[0][0]).toFixed(1) + 'Z', class: 'area' }));
    svg.appendChild(svgEl('path', { d: d, class: 'line' }));
    var last = points[points.length - 1];
    svg.appendChild(svgEl('circle', { cx: xs(last[0]), cy: ys(last[1]), r: 4, class: 'dot' }));

    // camada de hover: linha vertical + ponto + tooltip
    var cross = svgEl('line', { y1: pad.t, y2: H - pad.b, class: 'cross', visibility: 'hidden' });
    var hdot = svgEl('circle', { r: 4, class: 'dot', visibility: 'hidden' });
    svg.appendChild(cross);
    svg.appendChild(hdot);
    var tip = el('div', 'macro-tip');
    tip.hidden = true;
    var tipVal = el('strong'), tipDate = el('span');
    tip.appendChild(tipVal);
    tip.appendChild(tipDate);

    var current = points.length - 1;
    function show(i) {
      current = Math.max(0, Math.min(points.length - 1, i));
      var p = points[current], x = xs(p[0]), y = ys(p[1]);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
      hdot.setAttribute('cx', x); hdot.setAttribute('cy', y); hdot.setAttribute('visibility', 'visible');
      tipVal.textContent = fmtValue(ind, p[1], ind.tipDec);
      tipDate.textContent = fmtDate(p[0], ind.monthly);
      tip.hidden = false;
      var left = Math.min(Math.max(x - tip.offsetWidth / 2, 0), W - tip.offsetWidth);
      tip.style.left = left + 'px';
    }
    function hide() {
      cross.setAttribute('visibility', 'hidden');
      hdot.setAttribute('visibility', 'hidden');
      tip.hidden = true;
    }
    function nearest(clientX) {
      var rect = svg.getBoundingClientRect();
      var x = (clientX - rect.left) * (W / rect.width);
      var best = 0, dist = Infinity;
      for (var i = 0; i < points.length; i++) {
        var dx = Math.abs(xs(points[i][0]) - x);
        if (dx < dist) { dist = dx; best = i; }
      }
      return best;
    }
    svg.addEventListener('pointermove', function (e) { show(nearest(e.clientX)); });
    svg.addEventListener('pointerleave', hide);
    svg.addEventListener('focus', function () { show(current); });
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', function (e) {
      var stepSize = e.shiftKey ? 20 : 1;
      if (e.key === 'ArrowLeft') { show(current - stepSize); e.preventDefault(); }
      if (e.key === 'ArrowRight') { show(current + stepSize); e.preventDefault(); }
    });

    box.appendChild(svg);
    box.appendChild(tip);
  }

  function buildCard(ind) {
    var s = data.series[ind.key];
    var pts = s.points;
    var last = pts[pts.length - 1];
    var lastDay = parseDay(last[0]);
    var prev = valueAt(pts, new Date(lastDay.getFullYear() - 1, lastDay.getMonth(), lastDay.getDate()));

    var card = el('article', 'card macro-card');
    var head = el('div', 'macro-head');
    head.appendChild(el('h2', 'macro-label', T[ind.key][0]));
    head.appendChild(el('span', 'macro-date', fmtDate(last[0], ind.monthly)));
    card.appendChild(head);
    card.appendChild(el('p', 'macro-value', fmtValue(ind, last[1], ind.dec)));

    if (prev) {
      var diff = ind.delta === 'pct' ? (last[1] / prev[1] - 1) * 100 : last[1] - prev[1];
      var text;
      if (Math.abs(diff) < 0.005) text = T.noChange;
      else {
        var sign = diff > 0 ? '+' : '−';
        text = sign + num(Math.abs(diff), 2) + (ind.delta === 'pct' ? '%' : ' ' + T.pp) + ' ' + T.vs12;
      }
      card.appendChild(el('p', 'macro-delta', text));
    }

    card.appendChild(el('div', 'macro-chart'));
    var note = el('p', 'macro-note', T[ind.key][2] + ' ');
    var codes = [].concat(s.code);
    note.appendChild(el('span', 'macro-src', 'SGS ' + T.series + ' ' + codes.join(' + ')));
    card.appendChild(note);
    return card;
  }

  function renderTable() {
    // um valor por mês (o último do mês) para cada indicador, mais recente primeiro
    var months = {};
    INDICATORS.forEach(function (ind) {
      inRange(data.series[ind.key].points).forEach(function (p) {
        var m = p[0].slice(0, 7);
        (months[m] = months[m] || {})[ind.key] = p[1];
      });
    });
    tableHead.textContent = '';
    tableHead.appendChild(el('th', null, T.month));
    INDICATORS.forEach(function (ind) { tableHead.appendChild(el('th', null, T[ind.key][0])); });
    tableBody.textContent = '';
    Object.keys(months).sort().reverse().forEach(function (m) {
      var tr = el('tr');
      tr.appendChild(el('th', null, fmtDate(m + '-01', true)));
      INDICATORS.forEach(function (ind) {
        var v = months[m][ind.key];
        tr.appendChild(el('td', null, v == null ? '–' : fmtValue(ind, v, ind.tipDec)));
      });
      tableBody.appendChild(tr);
    });
  }

  var cards = [];
  function render() {
    cards.forEach(function (c) { drawChart(c.card, c.ind, inRange(data.series[c.ind.key].points)); });
    renderTable();
  }

  function init(json) {
    data = json;
    grid.textContent = '';
    cards = INDICATORS.map(function (ind) {
      var card = buildCard(ind);
      grid.appendChild(card);
      return { card: card, ind: ind };
    });
    var updated = new Date(data.updated);
    root.querySelector('.macro-updated').textContent = T.updated + ' ' +
      updated.toLocaleString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) +
      (LANG === 'pt' ? ' (horário de Brasília).' : ' (Brasília time).');
    render();
  }

  root.querySelectorAll('[data-years]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      years = +btn.dataset.years;
      root.querySelectorAll('[data-years]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      if (data) render();
    });
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (data) render(); }, 120);
  });

  fetch(root.dataset.src)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(init)
    .catch(function () {
      grid.textContent = '';
      grid.appendChild(el('p', 'macro-error', T.error));
    });
})();
