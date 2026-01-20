// ============================
// 0) Helpers / Toast / Storage
// ============================
const toastEl = document.getElementById("toast");
let toastTimer = null;

function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

const PRESET_KEY = "app_timer_presets_v1";
function loadPresets() {
  try {
    return JSON.parse(localStorage.getItem(PRESET_KEY) || "[]");
  } catch {
    return [];
  }
}
function savePresets(list) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(list));
}
let presets = loadPresets();

// Notification helper
function notifyTimerDone(appName) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification("Timer done", { body: `${appName} finished.` });
  }
}

// Alarm audio helper
let currentAlarmAudio = null;
function stopAlarm() {
  if (!currentAlarmAudio) return;
  currentAlarmAudio.pause();
  currentAlarmAudio.currentTime = 0;
  currentAlarmAudio = null;
}

// ============================
// 1) Grab DOM elements
// ============================
const permissionSection = document.getElementById("permissionSection");
const requestPermissionBtn = document.getElementById("requestPermissionBtn");

const timerForm = document.getElementById("timerForm");
const appNameInput = document.getElementById("appName");
const hoursInput = document.getElementById("hours");
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");

const soundModeDefault = document.getElementById("soundModeDefault");
const soundModeUpload = document.getElementById("soundModeUpload");
const soundModeBrowse = document.getElementById("soundModeBrowse");

const uploadSoundSection = document.getElementById("uploadSoundSection");
const timerSoundInput = document.getElementById("timerSound");

const browseSoundSection = document.getElementById("browseSoundSection");
const soundSearchInput = document.getElementById("soundSearch");
const soundSearchBtn = document.getElementById("soundSearchBtn");
const soundStatus = document.getElementById("soundStatus");
const soundPreviewPlayer = document.getElementById("soundPreviewPlayer");
const soundResults = document.getElementById("soundResults");

const timersList = document.getElementById("timersList");
const notificationSound = document.getElementById("notificationSound");

// Saved list (must exist in HTML)
const savedList = document.getElementById("savedList");

// ============================
// 2) Notifications permission
// ============================
function updatePermissionUI() {
  if (!permissionSection) return;
  if (!("Notification" in window)) {
    permissionSection.style.display = "none";
    return;
  }
  permissionSection.style.display =
    Notification.permission === "granted" ? "none" : "flex";
}

if (requestPermissionBtn) {
  requestPermissionBtn.addEventListener("click", async () => {
    if (!("Notification" in window)) return;

    // Best practice: request from a user gesture [page:1]
    await Notification.requestPermission();
    updatePermissionUI();
  });
}

// ============================
// 3) Sound mode UI (show/hide)
// ============================
function getSoundMode() {
  if (soundModeUpload?.checked) return "upload";
  if (soundModeBrowse?.checked) return "browse";
  return "default";
}

function updateSoundModeUI() {
  const mode = getSoundMode();
  if (uploadSoundSection) uploadSoundSection.style.display = mode === "upload" ? "block" : "none";
  if (browseSoundSection) browseSoundSection.style.display = mode === "browse" ? "block" : "none";
}

soundModeDefault?.addEventListener("change", updateSoundModeUI);
soundModeUpload?.addEventListener("change", updateSoundModeUI);
soundModeBrowse?.addEventListener("change", updateSoundModeUI);

// ============================
// 4) Browse sounds (Freesound)
// ============================
const FREESOUND_TOKEN = window.APP_CONFIG?.FREESOUND_TOKEN || "";
let selectedBrowseSound = null; // { name, previewUrl }

function setStatus(msg) {
  if (soundStatus) soundStatus.textContent = msg;
}

function clearBrowseResults() {
  if (soundResults) soundResults.innerHTML = "";
}

function setPreview(url) {
  if (!soundPreviewPlayer) return;
  soundPreviewPlayer.src = url || "";
  if (!url) soundPreviewPlayer.removeAttribute("src");
  soundPreviewPlayer.load();
}

async function searchFreesound(query) {
  if (!FREESOUND_TOKEN) {
    setStatus("Add your Freesound API token in config.js to enable searching.");
    return [];
  }

  setStatus("Searching...");
  clearBrowseResults();

  const url =
    "https://freesound.org/apiv2/search/?" +
    new URLSearchParams({
      query,
      fields: "id,name,previews"
    });

  const response = await fetch(url, {
    headers: { Authorization: `Token ${FREESOUND_TOKEN}` }
  });

  if (!response.ok) {
    setStatus(`Search failed (HTTP ${response.status}).`);
    return [];
  }

  const data = await response.json();
  const results = data.results || [];
  setStatus(results.length ? `Found ${results.length} sounds.` : "No results.");
  return results;
}

function renderBrowseResults(results) {
  clearBrowseResults();

  results.forEach((r) => {
    const row = document.createElement("div");
    row.className = "sound-result";

    const name = document.createElement("div");
    name.className = "sound-name";
    name.textContent = r.name || "Untitled";

    const previewUrl =
      (r.previews && (r.previews["preview-hq-mp3"] || r.previews["preview-lq-mp3"])) || null;

    const previewBtn = document.createElement("button");
    previewBtn.type = "button";
    previewBtn.textContent = "Preview";
    previewBtn.disabled = !previewUrl;
    previewBtn.addEventListener("click", () => {
      setPreview(previewUrl);
      setStatus(`Previewing: ${r.name}`);
    });

    const selectBtn = document.createElement("button");
    selectBtn.type = "button";
    selectBtn.textContent = "Select";
    selectBtn.disabled = !previewUrl;
    selectBtn.addEventListener("click", () => {
      selectedBrowseSound = { name: r.name, previewUrl };
      setStatus(`Selected sound: ${r.name}`);
      setPreview(previewUrl);
      toast("Successfully added sound");
    });

    row.appendChild(name);
    row.appendChild(previewBtn);
    row.appendChild(selectBtn);
    soundResults.appendChild(row);
  });
}

soundSearchBtn?.addEventListener("click", async () => {
  const query = (soundSearchInput?.value || "").trim();
  if (!query) {
    setStatus("Type a search term first (ex: alarm).");
    return;
  }
  const results = await searchFreesound(query);
  renderBrowseResults(results);
});

// ============================
// 5) Presets (Save + Load list)
// ============================
function loadPresetIntoForm(p) {
  appNameInput.value = p.appName;

  const h = Math.floor(p.totalSeconds / 3600);
  const m = Math.floor((p.totalSeconds % 3600) / 60);
  const s = p.totalSeconds % 60;

  hoursInput.value = h;
  minutesInput.value = m;
  secondsInput.value = s;

  if (p.soundType === "browse" && p.selectedBrowseSound?.previewUrl) {
    soundModeBrowse.checked = true;
    selectedBrowseSound = p.selectedBrowseSound;
    setStatus(`Loaded saved sound: ${selectedBrowseSound.name}`);
    setPreview(selectedBrowseSound.previewUrl);
  } else {
    soundModeDefault.checked = true;
    selectedBrowseSound = null;
  }

  updateSoundModeUI();
}

function renderPresets() {
  if (!savedList) return;
  savedList.innerHTML = "";

  if (!presets.length) {
    const empty = document.createElement("p");
    empty.textContent = "No saved timers yet.";
    savedList.appendChild(empty);
    return;
  }

  presets.forEach((p) => {
    const row = document.createElement("div");
    row.className = "saved-item";

    const label = document.createElement("div");
    label.textContent = `${p.appName} (${formatRemaining(p.totalSeconds, "clock")})`;

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.textContent = "Load";
    loadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      loadPresetIntoForm(p);
      toast("Loaded saved timer");
    });
    
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "✕";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      presets = presets.filter((x) => x.id !== p.id);
      savePresets(presets);
      renderPresets();
      toast("Removed saved timer");
    });

    // Optional: row click loads too
    row.addEventListener("click", () => {
      loadPresetIntoForm(p);
      toast("Loaded saved timer");
    });

    // IMPORTANT: append everything into row, then row into savedList
    row.appendChild(label);
    row.appendChild(loadBtn);
    row.appendChild(del);
    savedList.appendChild(row);
  });
}

// ============================
// 6) Timer creation + countdown
// ============================
function toInt(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

function getTotalSeconds() {
  const h = toInt(hoursInput?.value);
  const m = toInt(minutesInput?.value);
  const s = toInt(secondsInput?.value);
  return h * 3600 + m * 60 + s;
}

function formatRemaining(totalSeconds, style = "clock") {
  const s = Math.max(0, Math.floor(totalSeconds));

  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (style === "words") {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  // "clock" => HH:MM:SS (pads minutes/seconds; hours padded too for consistent look)
  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0")
  );
}

function startCountdown(displayEl, totalSeconds, onDone) {
  const endTime = Date.now() + totalSeconds * 1000;

  const render = () => {
    const remainingMs = endTime - Date.now();
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
    displayEl.textContent = `Remaining: ${formatRemaining(remainingSec, "clock")}`;

    if (remainingSec <= 0) {
      displayEl.textContent = "Done!";
      onDone?.();
      return true; // done
    }
    return false;
  };

  // Render immediately
  if (render()) return null;

  const intervalId = setInterval(() => {
    if (render()) clearInterval(intervalId);
  }, 1000);

  return intervalId;
}



timerForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const appName = (appNameInput?.value || "").trim();
  const totalSeconds = getTotalSeconds();
  const mode = getSoundMode();

  if (!appName) return;
  if (totalSeconds <= 0) return;

  // Decide sound attachment
  let soundLabel = "Default";
  let soundType = "default";
  let soundData = null;

  if (mode === "upload") {
    const file = timerSoundInput?.files?.[0];
    if (file) {
      soundLabel = file.name;
      soundType = "upload";
      soundData = file;
    }
  }

  if (mode === "browse") {
    if (selectedBrowseSound?.previewUrl) {
      soundLabel = selectedBrowseSound.name;
      soundType = "browse";
      soundData = selectedBrowseSound.previewUrl;
    }
  }

  const card = document.createElement("div");
  card.className = "timer-card";

  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";
  headerRow.style.gap = "10px";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = appName;

  const star = document.createElement("span");
  star.className = "star";
  star.textContent = "☆";
  star.title = "Save this timer";
  star.style.cursor = "pointer";

  star.addEventListener("click", () => {
    const preset = {
      id: Date.now(),
      appName,
      totalSeconds,
      soundType,
      selectedBrowseSound: soundType === "browse" ? selectedBrowseSound : null
    };

    presets.unshift(preset);
    savePresets(presets);
    renderPresets();
    toast("Saved timer");
  });

  headerRow.appendChild(title);
  headerRow.appendChild(star);

  const soundLine = document.createElement("div");
  soundLine.className = "sound";
  soundLine.textContent = `Sound: ${soundLabel}`;

  const time = document.createElement("div");
  time.className = "time";

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.style.display = "flex";
  actions.style.gap = "10px";
  actions.style.justifyContent = "flex-end";

  const stopBtn = document.createElement("button");
  stopBtn.type = "button";
  stopBtn.textContent = "Stop";

  card.appendChild(headerRow);
  card.appendChild(soundLine);
  card.appendChild(time);
  card.appendChild(actions);
  actions.appendChild(stopBtn);

  timersList.appendChild(card);

  let intervalId = null;

  stopBtn.addEventListener("click", () => {
    if (intervalId) clearInterval(intervalId);
    stopAlarm();
    card.remove(); // remove from Active Timers
  });

  intervalId = startCountdown(time, totalSeconds, () => {
    notifyTimerDone(appName);
    stopAlarm();

    if (soundType === "default") {
      currentAlarmAudio = notificationSound;
      if (currentAlarmAudio) {
        currentAlarmAudio.currentTime = 0;
        currentAlarmAudio.play();
      }
    } else if (soundType === "upload" && soundData) {
      const url = URL.createObjectURL(soundData);
      currentAlarmAudio = new Audio(url);
      currentAlarmAudio.play();
    } else if (soundType === "browse" && soundData) {
      currentAlarmAudio = new Audio(soundData);
      currentAlarmAudio.play();
    }

    // remove after short delay so user sees Done!
    setTimeout(() => card.remove(), 800);
  });

  // Reset form
  timerForm.reset();
  hoursInput.value = 0;
  minutesInput.value = 0;
  secondsInput.value = 0;

  updateSoundModeUI();
});

// ============================
// 7) Init
// ============================
updateSoundModeUI();
setStatus("Choose Browse to search and preview sounds.");
updatePermissionUI();
renderPresets();
