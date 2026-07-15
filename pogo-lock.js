/* =====================================================================
   POGO POKER PRE-LAUNCH LOCK — website-side gate.
   Intercepts clicks on the "Pogo Poker" nav links and shows a blurred
   countdown overlay until launch, instead of opening the poker app.
   Purely front-end; no backend involved.

   Change / disable:
     • window.POGO_LAUNCH_AT  — ISO time the lock lifts (edit below).
     • Testers bypass with  ?unlock=<KEY>  (persists in localStorage),
       then the poker links open normally.
   ===================================================================== */
(function () {
    'use strict';

    var LAUNCH_AT = Date.parse('2026-07-16T01:51:00Z'); // ~8:51pm Central, Jul 15
    var UNLOCK_KEY = 'pogo-poker-2026';
    var STORE = 'pogo_poker_unlocked';

    function isUnlocked() {
        try {
            var u = new URLSearchParams(location.search).get('unlock');
            if (u && u === UNLOCK_KEY) localStorage.setItem(STORE, '1');
            return localStorage.getItem(STORE) === '1';
        } catch (e) { return false; }
    }

    function launched() { return !isFinite(LAUNCH_AT) || Date.now() >= LAUNCH_AT; }

    var pad = function (n) { return String(n).padStart(2, '0'); };

    var overlay = null, timer = null;

    function buildOverlay() {
        var el = document.createElement('div');
        el.id = 'pogo-poker-lock';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-label', 'Pogo Poker opens soon');
        el.innerHTML =
            '<div class="ppl-scrim"></div>' +
            '<div class="ppl-card">' +
                '<button class="ppl-close" aria-label="Close">×</button>' +
                '<img class="ppl-chip" src="POGO-pfp.png" alt="">' +
                '<div class="ppl-eyebrow">Opens Soon</div>' +
                '<div class="ppl-title">POGO POKER</div>' +
                '<div class="ppl-clock" aria-live="off">··:··:··</div>' +
                '<div class="ppl-units">Hours&nbsp;&nbsp;&nbsp;Minutes&nbsp;&nbsp;&nbsp;Seconds</div>' +
                '<p class="ppl-copy">The felt’s getting dealt in. We’re running final ' +
                    'checks on the pond’s private cardroom — pull up a lily pad at launch.</p>' +
                '<div class="ppl-foot">$POGO • Robinhood Chain</div>' +
            '</div>';
        el.querySelector('.ppl-close').addEventListener('click', hide);
        el.querySelector('.ppl-scrim').addEventListener('click', hide);
        document.body.appendChild(el);
        return el;
    }

    function updateClock() {
        if (!overlay) return;
        var rem = LAUNCH_AT - Date.now();
        if (rem <= 0) { hide(); return; }
        var s = Math.floor(rem / 1000);
        overlay.querySelector('.ppl-clock').textContent =
            pad(Math.floor(s / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
    }

    function show() {
        if (!overlay) overlay = buildOverlay();
        overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        updateClock();
        clearInterval(timer);
        timer = setInterval(updateClock, 1000);
    }

    function hide() {
        if (overlay) overlay.classList.remove('is-open');
        document.body.style.overflow = '';
        clearInterval(timer);
    }

    function wire() {
        if (launched() || isUnlocked()) return; // links behave normally
        var links = document.querySelectorAll('a.pogo-poker-tab');
        for (var i = 0; i < links.length; i++) {
            links[i].addEventListener('click', function (e) {
                if (launched() || isUnlocked()) return;
                e.preventDefault();
                e.stopPropagation();
                show();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wire, { once: true });
    } else {
        wire();
    }
})();
