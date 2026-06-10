(function () {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const easeOut = (value) => 1 - Math.pow(1 - value, 3);

  function drawFrame(ctx, canvas, image, fit) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    const canvasRatio = canvas.width / canvas.height;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let offsetX = 0;
    let offsetY = 0;

    if ((fit === "contain" && imageRatio > canvasRatio) || (fit !== "contain" && imageRatio <= canvasRatio)) {
      drawWidth = canvas.width;
      drawHeight = drawWidth / imageRatio;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      drawHeight = canvas.height;
      drawWidth = drawHeight * imageRatio;
      offsetX = (canvas.width - drawWidth) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  }

  function revealAmount(progress, start, end) {
    if (progress < start || progress > end) return 0;
    const span = Math.max(end - start, 0.01);
    const edge = Math.min(0.1, span * 0.35);
    const fadeIn = start <= 0 ? 1 : edge ? clamp((progress - start) / edge, 0, 1) : 1;
    const fadeOut = end >= 1 ? 1 : edge ? clamp((end - progress) / edge, 0, 1) : 1;
    return easeOut(Math.min(fadeIn, fadeOut));
  }

  function offsetFor(direction, amount) {
    const distance = (1 - amount) * 28;
    const map = {
      up: `translate3d(0, ${distance}px, 0)`,
      down: `translate3d(0, ${-distance}px, 0)`,
      left: `translate3d(${distance}px, 0, 0)`,
      right: `translate3d(${-distance}px, 0, 0)`,
    };
    return map[direction] || map.up;
  }

  function initSectionReveals() {
    const animated = Array.from(document.querySelectorAll("[data-anim], [data-count]"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealNode = (node, observer) => {
      node.classList.add("is-visible");
      if (node.dataset.count) animateCount(node);
      if (observer) observer.unobserve(node);
    };

    if (reducedMotion) {
      animated.forEach((node) => {
        node.classList.add("is-visible");
        if (node.dataset.count) {
          const decimals = Number(node.dataset.countDecimals || 0);
          node.textContent = Number(node.dataset.count).toLocaleString("fr-FR", {
            maximumFractionDigits: decimals,
            minimumFractionDigits: decimals,
          });
        }
      });
      return;
    }

    const animateCount = (node) => {
      if (node.dataset.counted) return;
      node.dataset.counted = "true";
      const target = Number(node.dataset.count || 0);
      const decimals = Number(node.dataset.countDecimals || 0);
      const duration = 1100;
      const start = performance.now();

      const tick = (time) => {
        const amount = clamp((time - start) / duration, 0, 1);
        const value = easeOut(amount) * target;
        node.textContent = decimals
          ? value.toLocaleString("fr-FR", {
              maximumFractionDigits: decimals,
              minimumFractionDigits: decimals,
            })
          : Math.round(value).toLocaleString("fr-FR");
        if (amount < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealNode(entry.target, observer);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );

    const revealVisible = () => {
      animated.forEach((node) => {
        if (node.classList.contains("is-visible")) return;
        const rect = node.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.86 && rect.bottom > 0) revealNode(node, observer);
      });
    };

    animated.forEach((node) => {
      if (node.dataset.delay) node.style.setProperty("--delay", `${Number(node.dataset.delay) * 1000}ms`);
      observer.observe(node);
    });
    window.addEventListener("scroll", revealVisible, { passive: true });
    window.addEventListener("resize", revealVisible);
    window.setInterval(revealVisible, 200);
    revealVisible();
  }

  function initKsfScorecards() {
    const cards = Array.from(document.querySelectorAll(".ksf-card"));
    if (!cards.length) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animateScore = (node) => {
      if (node.dataset.ksfCounted) return;
      node.dataset.ksfCounted = "true";
      const target = Number(node.dataset.ksfCount || 0);

      if (reducedMotion) {
        node.textContent = target.toLocaleString("fr-FR");
        return;
      }

      const duration = 1150;
      const start = performance.now();

      const tick = (time) => {
        const amount = clamp((time - start) / duration, 0, 1);
        node.textContent = Math.round(easeOut(amount) * target).toLocaleString("fr-FR");
        if (amount < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const revealCard = (card, observer) => {
      if (card.dataset.ksfAnimated) return;
      card.dataset.ksfAnimated = "true";
      card.classList.add("is-ksf-animated");
      card.querySelectorAll("[data-ksf-count]").forEach(animateScore);
      if (observer) observer.unobserve(card);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) revealCard(entry.target, observer);
        });
      },
      { threshold: 0.28, rootMargin: "0px 0px -10% 0px" }
    );

    const revealVisible = () => {
      cards.forEach((card) => {
        if (card.dataset.ksfAnimated) return;
        const rect = card.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.88 && rect.bottom > 0) revealCard(card, observer);
      });
    };

    cards.forEach((card) => observer.observe(card));
    window.addEventListener("scroll", revealVisible, { passive: true });
    window.addEventListener("resize", revealVisible);
    window.setInterval(revealVisible, 200);
    revealVisible();
  }

  function initDeferredAnimationFrames() {
    const frames = Array.from(document.querySelectorAll("[data-animation-src]"));
    if (!frames.length) return;

    const loadFrame = (frame, observer) => {
      if (frame.dataset.animationLoaded) return;
      frame.dataset.animationLoaded = "true";
      frame.src = frame.dataset.animationSrc;
      if (observer) observer.unobserve(frame);
    };

    const revealVisible = (observer) => {
      frames.forEach((frame) => {
        if (frame.dataset.animationLoaded) return;
        const rect = frame.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.82 && rect.bottom > window.innerHeight * 0.08) {
          loadFrame(frame, observer);
        }
      });
    };

    if (!("IntersectionObserver" in window)) {
      revealVisible();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) loadFrame(entry.target, observer);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -12% 0px" }
    );

    frames.forEach((frame) => observer.observe(frame));
    window.addEventListener("scroll", () => revealVisible(observer), { passive: true });
    window.addEventListener("resize", () => revealVisible(observer));
    revealVisible(observer);
  }

  function initScrollVideo(options) {
    const config = {
      canvas: "#scroll-canvas",
      track: "[data-scroll-video]",
      loader: "[data-loader]",
      framesPath: "",
      frameCount: 0,
      pad: 3,
      ext: "jpg",
      fit: "cover",
      scrollVh: 950,
      hideScrollbarUntilEnd: false,
      hideNavUntilEnd: false,
      ...options,
    };

    const canvas = document.querySelector(config.canvas);
    const track = document.querySelector(config.track);
    const loader = document.querySelector(config.loader);
    const progressBar = loader ? loader.querySelector("[data-loader-bar]") : null;
    const progressText = loader ? loader.querySelector("[data-loader-progress]") : null;
    const ctx = canvas ? canvas.getContext("2d") : null;
    const panels = Array.from(document.querySelectorAll("[data-reveal-start]"));

    if (!canvas || !track || !ctx || !config.frameCount) return;

    track.style.setProperty("--scroll-height", `${config.scrollVh}vh`);

    const images = new Array(config.frameCount + 1);
    let loaded = 0;
    let currentFrame = -1;
    let lastDrawableFrame = 1;
    let ticking = false;

    const frameSrc = (index) =>
      `${config.framesPath}${String(index).padStart(config.pad, "0")}.${config.ext}`;

    const loadFrame = (index) =>
      new Promise((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          images[index] = image;
          loaded += 1;
          if (index === 1) drawFrame(ctx, canvas, image, config.fit);
          updateLoader();
          resolve(image);
        };
        image.onerror = () => {
          loaded += 1;
          updateLoader();
          resolve(null);
        };
        image.src = frameSrc(index);
      });

    function updateLoader() {
      const amount = clamp(loaded / config.frameCount, 0, 1);
      if (progressBar) progressBar.style.transform = `scaleX(${amount})`;
      if (progressText) progressText.textContent = `${Math.round(amount * 100)}%`;

      if (amount >= 1 && loader) {
        window.setTimeout(() => {
          loader.classList.add("is-hidden");
          document.documentElement.classList.add("is-loaded");
        }, 180);
      }
    }

    function currentProgress() {
      const total = Math.max(track.offsetHeight - window.innerHeight, 1);
      return clamp(-track.getBoundingClientRect().top / total, 0, 1);
    }

    function findLoadedFrame(index) {
      if (images[index]) return index;
      for (let distance = 1; distance < 18; distance += 1) {
        const before = index - distance;
        const after = index + distance;
        if (before > 0 && images[before]) return before;
        if (after <= config.frameCount && images[after]) return after;
      }
      return lastDrawableFrame;
    }

    function updatePanels(progress) {
      panels.forEach((panel) => {
        const start = Number(panel.dataset.revealStart || 0);
        const end = Number(panel.dataset.revealEnd || 1);
        const direction = panel.dataset.revealFrom || "up";
        const amount = revealAmount(progress, start, end);

        panel.style.opacity = amount.toFixed(3);
        panel.style.transform = offsetFor(direction, amount);
        panel.style.pointerEvents = amount > 0.4 ? "auto" : "none";
      });
    }

    function updateScrollbar(progress) {
      if (!config.hideScrollbarUntilEnd) return;
      document.documentElement.classList.toggle("video-scrollbar-hidden", progress < 0.995);
    }

    function updateNav(progress) {
      if (!config.hideNavUntilEnd) return;
      document.documentElement.classList.toggle("video-nav-hidden", progress < 0.995);
    }

    function render() {
      ticking = false;
      const progress = currentProgress();
      const wantedFrame = clamp(Math.round(progress * (config.frameCount - 1)) + 1, 1, config.frameCount);
      const drawableFrame = findLoadedFrame(wantedFrame);

      if (drawableFrame !== currentFrame && images[drawableFrame]) {
        currentFrame = drawableFrame;
        lastDrawableFrame = drawableFrame;
        drawFrame(ctx, canvas, images[drawableFrame], config.fit);
      }

      updatePanels(progress);
      updateScrollbar(progress);
      updateNav(progress);
    }

    function requestRender() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(render);
      window.setTimeout(() => {
        if (ticking) render();
      }, 80);
    }

    const resizeObserver = new ResizeObserver(requestRender);
    resizeObserver.observe(canvas);
    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestRender);
    window.setInterval(render, 140);

    loadFrame(1).then(render);

    const queue = [];
    for (let index = 2; index <= config.frameCount; index += 1) queue.push(index);

    let active = 0;
    const next = () => {
      while (active < 8 && queue.length) {
        active += 1;
        loadFrame(queue.shift()).then(() => {
          active -= 1;
          next();
        });
      }
    };
    next();

    initSectionReveals();
    initKsfScorecards();
    initDeferredAnimationFrames();
  }

  window.initScrollVideo = initScrollVideo;
})();
