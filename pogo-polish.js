/* =====================================================================
   POGO POLISH — the final-touches delight layer
   Purely additive: ambient pond motion, celebratory confetti, stat
   pops, and small easter eggs. Hooks existing buttons via listeners
   (never overrides script.js logic). Fully reduced-motion aware.
   ===================================================================== */
(function () {
    'use strict';

    var reduce = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Pond ambiance: spores drifting up through the pond ---------- */
    function initAmbiance() {
        if (reduce) return;
        if (document.querySelector('.pond-ambiance')) return;
        var layer = document.createElement('div');
        layer.className = 'pond-ambiance';
        layer.setAttribute('aria-hidden', 'true');
        var colors = ['#d9fb4b', '#ffc52f', '#9be86a', '#fffdf1', '#43c8e6'];
        var N = window.innerWidth < 640 ? 10 : 18;
        for (var i = 0; i < N; i++) {
            var s = document.createElement('span');
            var size = 4 + Math.random() * 9;
            var sway = (Math.random() * 70 - 35).toFixed(0);
            s.style.cssText =
                'position:absolute;bottom:-24px;left:' + (Math.random() * 100).toFixed(2) + '%;' +
                'width:' + size.toFixed(1) + 'px;height:' + size.toFixed(1) + 'px;border-radius:50%;' +
                'background:' + colors[i % colors.length] + ';' +
                'opacity:' + (0.22 + Math.random() * 0.34).toFixed(2) + ';' +
                'filter:blur(' + (Math.random() * 1.3).toFixed(1) + 'px);' +
                '--sway:' + sway + 'px;' +
                'animation:pond-rise ' + (15 + Math.random() * 16).toFixed(1) + 's linear ' +
                (-Math.random() * 26).toFixed(1) + 's infinite;';
            layer.appendChild(s);
        }
        document.body.appendChild(layer);
    }

    /* ---------- Confetti burst (pond palette) ---------- */
    function confetti(x, y) {
        if (reduce) return;
        var c = document.createElement('canvas');
        c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;';
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = window.innerWidth * dpr;
        c.height = window.innerHeight * dpr;
        document.body.appendChild(c);
        var ctx = c.getContext('2d');
        ctx.scale(dpr, dpr);
        var colors = ['#d9fb4b', '#159447', '#ffc52f', '#43c8e6', '#fffdf1'];
        var P = [];
        var count = 110;
        for (var i = 0; i < count; i++) {
            var a = Math.random() * Math.PI * 2;
            var sp = 4 + Math.random() * 11;
            P.push({
                x: x, y: y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp - 7,
                s: 5 + Math.random() * 8,
                rot: Math.random() * 6,
                vr: (Math.random() - 0.5) * 0.45,
                col: colors[i % colors.length],
                life: 0,
                max: 70 + Math.random() * 55
            });
        }
        function frame() {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            var alive = false;
            for (var i = 0; i < P.length; i++) {
                var p = P[i];
                if (p.life > p.max) continue;
                alive = true;
                p.life++;
                p.vy += 0.3;
                p.vx *= 0.99;
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.vr;
                ctx.save();
                ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.col;
                ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
                ctx.restore();
            }
            if (alive) requestAnimationFrame(frame);
            else c.remove();
        }
        requestAnimationFrame(frame);
    }
    window.pogoConfetti = confetti;

    function centerOf(el) {
        var r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    /* ---------- Stat count/pop on change ---------- */
    function watchStat(el) {
        if (!el) return;
        var mo = new MutationObserver(function () {
            el.classList.remove('pg-pop');
            void el.offsetWidth; /* reflow to restart animation */
            el.classList.add('pg-pop');
        });
        mo.observe(el, { childList: true, characterData: true, subtree: true });
    }

    /* ---------- Wire everything up ---------- */
    function init() {
        initAmbiance();

        // Celebrate a downloaded PFP
        var dl = document.querySelector('.place-order-btn');
        if (dl) {
            dl.addEventListener('click', function () {
                var p = centerOf(dl);
                confetti(p.x, p.y);
            });
        }

        // "Surprise Me" spins the stage
        var wild = document.querySelector('.pg-combo-wild');
        var stage = document.querySelector('.pg-stage-card');
        if (wild && stage) {
            wild.addEventListener('click', function () {
                if (reduce) return;
                stage.classList.remove('pg-spin');
                void stage.offsetWidth;
                stage.classList.add('pg-spin');
            });
        }

        // Stat pops
        watchStat(document.getElementById('currentScore'));
        watchStat(document.getElementById('bestScore'));
        watchStat(document.getElementById('ordersServed'));

        // Logo easter egg — hop on click, confetti on a quick combo
        var logo = document.querySelector('.header-logo');
        if (logo) {
            var taps = 0, tReset = null;
            logo.addEventListener('click', function () {
                logo.classList.remove('pg-hop');
                void logo.offsetWidth;
                logo.classList.add('pg-hop');
                taps++;
                clearTimeout(tReset);
                tReset = setTimeout(function () { taps = 0; }, 1200);
                if (taps >= 3) {
                    taps = 0;
                    var p = centerOf(logo);
                    confetti(p.x, p.y);
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
