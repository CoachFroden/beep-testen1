(() => {
  const levelSpeeds = {
    1: 8.5, 2: 9.0, 3: 9.5, 4: 10.0, 5: 10.5, 6: 11.0, 7: 11.5,
    8: 12.0, 9: 12.5, 10: 13.0, 11: 13.5, 12: 14.0, 13: 14.5,
    14: 15.0, 15: 15.5, 16: 16.0, 17: 16.5, 18: 17.0, 19: 17.5,
    20: 18.0, 21: 18.5
  };

  const refs = {
    status: document.getElementById('testStatus'),
    network: document.getElementById('networkStatus'),
    level: document.getElementById('levelDisplay'),
    participants: document.getElementById('participants'),
    speed: document.getElementById('speedMetric'),
    active: document.getElementById('activeMetric'),
    done: document.getElementById('doneMetric'),
    total: document.getElementById('participantTotal'),
    participantActive: document.getElementById('participantActive'),
    lastResult: document.getElementById('lastResult'),
    start: document.getElementById('startTestBtn'),
    stop: document.getElementById('pauseTestBtn'),
    reset: document.getElementById('resetTestBtn'),
    fullscreen: document.getElementById('fullscreenBtn')
  };

  let previousDone = 0;
  let statusLocked = false;

  function setStatus(label, state) {
    if (!refs.status) return;
    refs.status.dataset.state = state;
    const labelNode = refs.status.querySelector('span:last-child');
    if (labelNode) labelNode.textContent = label;
  }

  function parseLevelDisplay() {
    const text = refs.level?.textContent || '';
    const match = text.match(/Nivå\s+(\d+)\s+[–-]\s+Shuttle\s+(\d+)\/(\d+)/i);
    if (!match) return null;
    return {
      level: Number(match[1]),
      shuttle: Number(match[2]),
      totalShuttles: Number(match[3])
    };
  }

  function updateLiveMetrics() {
    const current = parseLevelDisplay();
    if (!current) return;

    const speed = levelSpeeds[current.level];
    if (refs.speed && speed) {
      refs.speed.textContent = speed.toFixed(1).replace('.', ',');
    }

    if (current.shuttle > 0 && !statusLocked) {
      setStatus('PÅGÅR', 'running');
    }
  }

  function getParticipantButtons() {
    return refs.participants ? [...refs.participants.querySelectorAll('button')] : [];
  }

  function updateParticipantMetrics({ announce = false } = {}) {
    const buttons = getParticipantButtons();
    const doneButtons = buttons.filter(button => button.classList.contains('done'));
    const done = doneButtons.length;
    const active = Math.max(0, buttons.length - done);

    if (refs.total) refs.total.textContent = String(buttons.length);
    if (refs.participantActive) refs.participantActive.textContent = String(active);
    if (refs.active) refs.active.textContent = String(active);
    if (refs.done) refs.done.textContent = String(done);

    if (announce && done > previousDone) {
      const newest = doneButtons[doneButtons.length - 1];
      if (newest && refs.lastResult) {
        refs.lastResult.textContent = `Sist registrert: ${newest.textContent}`;
        refs.lastResult.classList.remove('hidden');
      }
      if ('vibrate' in navigator) navigator.vibrate(30);
    }

    if (done === 0 && refs.lastResult) {
      refs.lastResult.classList.add('hidden');
      refs.lastResult.textContent = '';
    }

    previousDone = done;
  }

  function updateNetworkStatus() {
    if (!refs.network) return;
    const online = navigator.onLine;
    refs.network.textContent = online ? 'Tilkoblet' : 'Offline';
    refs.network.classList.toggle('offline', !online);
  }

  refs.start?.addEventListener('click', () => {
    statusLocked = false;
    setStatus('STARTER', 'running');
  });

  refs.stop?.addEventListener('click', () => {
    statusLocked = true;
    setStatus('AVBRUTT', 'stopped');
  });

  refs.reset?.addEventListener('click', () => {
    statusLocked = true;
    setStatus('KLAR', 'ready');
    window.setTimeout(() => {
      updateLiveMetrics();
      updateParticipantMetrics();
      statusLocked = false;
    }, 0);
  });

  refs.fullscreen?.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (_) {
      // Fullscreen er ikke tilgjengelig i alle iOS/PWA-kontekster.
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (!refs.fullscreen) return;
    refs.fullscreen.setAttribute(
      'aria-label',
      document.fullscreenElement ? 'Avslutt fullskjerm' : 'Vis i fullskjerm'
    );
  });

  if (refs.level) {
    new MutationObserver(updateLiveMetrics).observe(refs.level, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  if (refs.participants) {
    new MutationObserver(() => updateParticipantMetrics({ announce: true })).observe(refs.participants, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);

  updateNetworkStatus();
  updateLiveMetrics();
  window.setTimeout(() => updateParticipantMetrics(), 0);
})();
