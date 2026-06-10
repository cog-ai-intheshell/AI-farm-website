(function () {
  const audioSrc = "song/ALL%20THE%20LOVE%20by%20Ye%20in%20another%20dimension..mp3";
  const audio = new Audio(audioSrc);
  let unlockButton = null;
  let hasStarted = false;

  audio.loop = true;
  audio.autoplay = true;
  audio.preload = "auto";
  audio.volume = 0.42;
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

  function startAudio() {
    if (hasStarted) {
      return Promise.resolve();
    }

    return audio
      .play()
      .then(() => {
        hasStarted = true;
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
})();
