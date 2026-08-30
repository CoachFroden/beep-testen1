(() => {
  const NativeAudioContext = window.AudioContext || window.webkitAudioContext;
  if (!NativeAudioContext) return;

  let primaryContext = null;
  let testBuffer = null;
  let testActive = false;
  let lastWarningAt = 0;

  function updateAudioMessage(message, isWarning = false) {
    const status = document.getElementById("audioCheckStatus");
    if (status) {
      status.textContent = message;
      status.dataset.state = isWarning ? "warning" : "ok";
    }

    if (!isWarning) return;

    const now = Date.now();
    if (now - lastWarningAt < 5000) return;
    lastWarningAt = now;

    const toast = document.getElementById("statusMessage");
    if (toast) {
      toast.textContent = message;
      toast.classList.remove("hidden");
      window.setTimeout(() => toast.classList.add("hidden"), 3500);
    }
  }

  function attachContextGuards(context) {
    if (!context || context.__beepGuardAttached) return context;
    context.__beepGuardAttached = true;

    context.addEventListener("statechange", () => {
      if (context.state === "running") {
        updateAudioMessage("Lyd klar");
        return;
      }

      if (testActive && context.state === "suspended") {
        ensureRunning();
      }
    });

    return context;
  }

  function createOrReuseContext(args = []) {
    if (primaryContext && primaryContext.state !== "closed") {
      return primaryContext;
    }

    primaryContext = attachContextGuards(
      Reflect.construct(NativeAudioContext, args)
    );

    return primaryContext;
  }

  function GuardedAudioContext(...args) {
    return createOrReuseContext(args);
  }

  GuardedAudioContext.prototype = NativeAudioContext.prototype;
  try {
    Object.setPrototypeOf(GuardedAudioContext, NativeAudioContext);
  } catch (_) {}

  window.AudioContext = GuardedAudioContext;
  if (window.webkitAudioContext) {
    window.webkitAudioContext = GuardedAudioContext;
  }

  async function ensureRunning() {
    if (!primaryContext || primaryContext.state === "closed") return false;

    if (primaryContext.state === "suspended") {
      try {
        await primaryContext.resume();
      } catch (_) {}
    }

    const running = primaryContext.state === "running";
    if (!running && testActive) {
      updateAudioMessage("Lydmotor stoppet – trykk Test beep", true);
    }
    return running;
  }

  async function getTestBuffer(context) {
    if (testBuffer) return testBuffer;

    const response = await fetch("beep.wav", { cache: "force-cache" });
    if (!response.ok) throw new Error("Kunne ikke hente beep.wav");
    const data = await response.arrayBuffer();
    testBuffer = await context.decodeAudioData(data);
    return testBuffer;
  }

  async function playTestBeep() {
    try {
      const context = createOrReuseContext();
      const running = await ensureRunning();

      if (!running) {
        updateAudioMessage("Ingen lyd – trykk knappen igjen", true);
        return false;
      }

      const buffer = await getTestBuffer(context);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start();

      updateAudioMessage("Beep spilt – lyd er klar");
      if ("vibrate" in navigator) navigator.vibrate(25);
      return true;
    } catch (error) {
      console.warn("Beep-test av lyd feilet", error);
      updateAudioMessage("Kunne ikke spille beep", true);
      return false;
    }
  }

  function wakeAudio() {
    if (primaryContext?.state === "suspended") {
      ensureRunning();
    }
  }

  // iOS kan suspendere Web Audio mens vanlig Audio() spiller intro/nedtelling.
  // Vi prøver derfor å vekke samme AudioContext jevnlig mens testen er aktiv.
  window.setInterval(() => {
    if (testActive) wakeAudio();
  }, 300);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) wakeAudio();
  });
  window.addEventListener("focus", wakeAudio);
  window.addEventListener("pageshow", wakeAudio);

  ["pointerdown", "touchstart", "keydown"].forEach(eventName => {
    window.addEventListener(eventName, wakeAudio, { passive: true, capture: true });
  });

  // Når intro/nedtelling med HTMLAudio er ferdig, vekk Web Audio umiddelbart.
  const nativeMediaPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    this.addEventListener("ended", () => {
      if (testActive) {
        wakeAudio();
        window.setTimeout(wakeAudio, 80);
      }
    }, { once: true });

    return nativeMediaPlay.apply(this, args);
  };

  const startButton = document.getElementById("startTestBtn");
  const stopButton = document.getElementById("pauseTestBtn");
  const resetButton = document.getElementById("resetTestBtn");
  const testButton = document.getElementById("testBeepBtn");

  startButton?.addEventListener("click", () => {
    testActive = true;
    wakeAudio();
    window.setTimeout(wakeAudio, 50);
    window.setTimeout(wakeAudio, 250);
  });

  stopButton?.addEventListener("click", () => {
    testActive = false;
  });

  resetButton?.addEventListener("click", () => {
    testActive = false;
  });

  testButton?.addEventListener("click", playTestBeep);

  window.__beepAudioGuard = {
    ensureRunning,
    playTestBeep,
    getContext: () => primaryContext
  };
})();