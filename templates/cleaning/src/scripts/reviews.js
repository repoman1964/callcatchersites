// Reviews carousel (dots + arrows) and See more/less toggles.
// Ported verbatim from the source build.
(() => {
    const COLLAPSED_MAX = '6.5rem';
    const DURATION = '380ms cubic-bezier(0.16, 1, 0.3, 1)';
    const DOT_BASE =
      'h-2 shrink-0 cursor-pointer rounded-full border-0 p-0 transition-[width,background-color] duration-220 ease-in-out';
    const DOT_ACTIVE = 'w-5.5 bg-accent';
    const DOT_INACTIVE = 'w-2 bg-border';
    let allItems = [];

    const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function expandItem(item) {
      item.toggle.setAttribute('aria-expanded', 'true');
      item.toggle.textContent = 'See less';
      if (prefersReduced()) {
        item.text.style.maxHeight = 'none';
        return;
      }
      const targetHeight = item.text.scrollHeight;
      item.text.style.transition = `max-height ${DURATION}`;
      item.text.style.maxHeight = targetHeight + 'px';
      item.text.addEventListener('transitionend', () => {
        item.text.style.maxHeight = 'none';
      }, { once: true });
    }

    function collapseItem(item) {
      item.toggle.setAttribute('aria-expanded', 'false');
      item.toggle.textContent = 'See more';
      const currentHeight = item.text.scrollHeight;
      item.text.style.transition = 'none';
      item.text.style.maxHeight = currentHeight + 'px';
      requestAnimationFrame(() => {
        if (!prefersReduced()) {
          item.text.style.transition = `max-height ${DURATION}`;
        }
        item.text.style.maxHeight = COLLAPSED_MAX;
      });
    }

    function setupReviewToggles() {
      document.querySelectorAll('[data-review-toggle]').forEach(t => {
        delete t.dataset.bound;
      });
      allItems = [];

      const cards = document.querySelectorAll('[data-review-card]');
      for (const card of cards) {
        const text = card.querySelector('[data-review-text]');
        const toggle = card.querySelector('[data-review-toggle]');
        if (!(text instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement)) continue;

        text.style.transition = 'none';
        text.style.overflow = 'hidden';
        text.style.maxHeight = COLLAPSED_MAX;

        const isOverflowing = text.scrollHeight > text.clientHeight + 2;

        if (!isOverflowing) {
          toggle.hidden = true;
          text.style.maxHeight = 'none';
          text.style.overflow = '';
          text.style.transition = '';
          continue;
        }

        toggle.hidden = false;
        const item = { text, toggle };
        allItems.push(item);

        if (toggle.dataset.bound) continue;
        toggle.dataset.bound = '1';

        toggle.addEventListener('click', () => {
          const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
          if (!isExpanded) {
            allItems.forEach(other => {
              if (other !== item && other.toggle.getAttribute('aria-expanded') === 'true') {
                collapseItem(other);
              }
            });
            expandItem(item);
          } else {
            collapseItem(item);
          }
        });
      }
    }

    function setupCarousel(trackId, dotsId) {
      const track = document.getElementById(trackId);
      const dotsContainer = document.getElementById(dotsId);
      const prev = document.getElementById('reviews-prev-m');
      const next = document.getElementById('reviews-next-m');
      if (!track) return;

      const cards = [...track.querySelectorAll('[data-review-card]')];
      if (cards.length === 0) return;

      track.__reviewsCarouselAbort?.abort();
      const abort = new AbortController();
      track.__reviewsCarouselAbort = abort;
      const { signal } = abort;

      /** Matches md/lg breakpoints in card basis classes */
      const getCardsPerView = () => {
        const w = window.innerWidth;
        if (w < 768) return 1;
        if (w < 1024) return 2;
        return 3;
      };

      const getScrollStride = () =>
        cards[0].offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 20);

      const getPageCount = () => Math.max(1, cards.length - getCardsPerView() + 1);

      const getCurrentPage = () => {
        const stride = getScrollStride();
        if (!stride) return 0;
        const page = Math.round(track.scrollLeft / stride);
        return Math.min(getPageCount() - 1, Math.max(0, page));
      };

      const scrollToPage = (page) => {
        track.scrollTo({ left: page * getScrollStride(), behavior: 'smooth' });
      };

      const doScroll = (dir) => track.scrollBy({ left: dir * getScrollStride(), behavior: 'smooth' });

      prev?.addEventListener('click', () => doScroll(-1), { signal });
      next?.addEventListener('click', () => doScroll(1), { signal });

      const renderDots = () => {
        if (!dotsContainer) return;
        const pageCount = getPageCount();
        const activePage = getCurrentPage();

        dotsContainer.innerHTML = '';
        dotsContainer.hidden = pageCount <= 1;

        for (let i = 0; i < pageCount; i++) {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = `${DOT_BASE} ${i === activePage ? DOT_ACTIVE : DOT_INACTIVE}`;
          dot.setAttribute('role', 'tab');
          dot.setAttribute('aria-selected', i === activePage ? 'true' : 'false');
          dot.setAttribute('aria-label', `Review page ${i + 1} of ${pageCount}`);
          dot.addEventListener('click', () => scrollToPage(i), { signal });
          dotsContainer.appendChild(dot);
        }
      };

      const updateActiveDot = () => {
        if (!dotsContainer || dotsContainer.hidden) return;
        const page = getCurrentPage();
        [...dotsContainer.querySelectorAll('button')].forEach((dot, i) => {
          const isActive = i === page;
          dot.className = `${DOT_BASE} ${isActive ? DOT_ACTIVE : DOT_INACTIVE}`;
          dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
      };

      renderDots();

      let scrollTimer;
      track.addEventListener(
        'scroll',
        () => {
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(updateActiveDot, 60);
        },
        { passive: true, signal },
      );

      let resizeTimer;
      window.addEventListener(
        'resize',
        () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            const page = Math.min(getCurrentPage(), getPageCount() - 1);
            renderDots();
            scrollToPage(page);
            updateActiveDot();
          }, 150);
        },
        { signal },
      );

      updateActiveDot();
    }

    function init() {
      setupReviewToggles();
      setupCarousel('reviews-track', 'reviews-dots');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
      init();
    }
    document.addEventListener('astro:page-load', init);
  })();
