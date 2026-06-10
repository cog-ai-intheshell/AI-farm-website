(function () {
  const audioSrc = "song/ALL%20THE%20LOVE%20by%20Ye%20in%20another%20dimension..mp3";
  const startAtSeconds = 15;
  const endAtSeconds = 37;
  const fadeOutDurationSeconds = 7;
  const baseVolume = 0.42;
  const audio = new Audio(audioSrc);
  let unlockButton = null;
  let hasStarted = false;
  let hasAppliedStartTime = false;
  let fadeFrame = null;

  audio.loop = false;
  audio.autoplay = true;
  audio.preload = "auto";
  audio.volume = baseVolume;
  audio.setAttribute("playsinline", "");

  function hideUnlockButton() {
    if (unlockButton) {
      unlockButton.classList.remove("is-visible");
    }
  }

  function showUnlockButton() {
    if (!document.body || unlockButton) {
      return;
    }

    unlockButton = document.createElement("button");
    unlockButton.type = "button";
    unlockButton.className = "audio-unlock";
    unlockButton.setAttribute("aria-label", "Activer la musique");
    unlockButton.textContent = "Activer le son";
    unlockButton.addEventListener("click", () => {
      startAudio();
    });
    document.body.appendChild(unlockButton);

    requestAnimationFrame(() => {
      unlockButton.classList.add("is-visible");
    });
  }

  function applyStartTime() {
    if (hasAppliedStartTime) {
      return;
    }

    try {
      audio.currentTime = startAtSeconds;
      hasAppliedStartTime = true;
    } catch {
      audio.addEventListener("loadedmetadata", applyStartTime, { once: true });
    }
  }

  function stopAtEndTime() {
    const fadeStartSeconds = endAtSeconds - fadeOutDurationSeconds;

    if (audio.currentTime >= endAtSeconds) {
      audio.pause();
      audio.currentTime = endAtSeconds;
      audio.volume = 0;
      if (fadeFrame) {
        cancelAnimationFrame(fadeFrame);
        fadeFrame = null;
      }
      return;
    }

    if (audio.currentTime >= fadeStartSeconds) {
      const fadeProgress = (audio.currentTime - fadeStartSeconds) / fadeOutDurationSeconds;
      audio.volume = Math.max(0, baseVolume * (1 - fadeProgress));
      return;
    }

    audio.volume = baseVolume;
  }

  function runFadeLoop() {
    stopAtEndTime();

    if (!audio.paused) {
      fadeFrame = requestAnimationFrame(runFadeLoop);
    }
  }

  function startAudio() {
    if (hasStarted) {
      return Promise.resolve();
    }

    applyStartTime();

    return audio
      .play()
      .then(() => {
        hasStarted = true;
        audio.volume = baseVolume;
        fadeFrame = requestAnimationFrame(runFadeLoop);
        hideUnlockButton();
      })
      .catch(() => {
        showUnlockButton();
      });
  }

  function startAfterInteraction() {
    startAudio();
    window.removeEventListener("pointerdown", startAfterInteraction);
    window.removeEventListener("click", startAfterInteraction);
    window.removeEventListener("keydown", startAfterInteraction);
    window.removeEventListener("touchstart", startAfterInteraction);
    window.removeEventListener("wheel", startAfterInteraction);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(audio);
    startAudio();
  });

  window.addEventListener("pointerdown", startAfterInteraction, { passive: true });
  window.addEventListener("click", startAfterInteraction);
  window.addEventListener("keydown", startAfterInteraction);
  window.addEventListener("touchstart", startAfterInteraction, { passive: true });
  window.addEventListener("wheel", startAfterInteraction, { passive: true });
  audio.addEventListener("timeupdate", stopAtEndTime);
})();
