// Carrossel dos projetos: setas e bolinhas por cima de uma trilha com scroll-snap.
(function () {
  'use strict';
  var track = document.querySelector('.projects');
  if (!track) return;
  var pt = document.documentElement.lang.indexOf('pt') === 0;
  var arrows = document.querySelector('.carousel-arrows');
  var dotsBox = document.querySelector('.carousel-dots');
  var buttons = arrows.querySelectorAll('[data-dir]');
  var cards = Array.prototype.slice.call(track.children);

  function step() {
    return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth;
  }
  function perView() {
    var gap = step() - cards[0].offsetWidth;
    return Math.max(1, Math.floor((track.clientWidth + gap + 1) / step()));
  }
  function positions() {
    return Math.max(1, cards.length - perView() + 1);
  }
  function go(i) {
    track.scrollTo({ left: i * step() });
  }

  function buildDots() {
    dotsBox.textContent = '';
    for (var i = 0; i < positions(); i++) {
      var b = document.createElement('button');
      b.type = 'button';
      var title = cards[i].querySelector('h3').textContent;
      b.setAttribute('aria-label', (pt ? 'Mostrar ' : 'Show ') + title);
      b.addEventListener('click', go.bind(null, i));
      dotsBox.appendChild(b);
    }
  }

  function update() {
    var max = track.scrollWidth - track.clientWidth;
    var scrollable = max > 1;
    arrows.hidden = dotsBox.hidden = !scrollable;
    buttons[0].disabled = track.scrollLeft <= 1;
    buttons[1].disabled = track.scrollLeft >= max - 1;
    var current = Math.min(positions() - 1, Math.round(track.scrollLeft / step()));
    Array.prototype.forEach.call(dotsBox.children, function (d, i) {
      if (i === current) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      track.scrollBy({ left: +b.dataset.dir * step() });
    });
  });

  var raf;
  track.addEventListener('scroll', function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(update);
  }, { passive: true });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { buildDots(); update(); }, 120);
  });

  buildDots();
  update();
})();
