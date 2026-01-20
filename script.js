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

// Custom notification message (loaded later)
let customNotificationMsg = "";

// Notification helper
function notifyTimerDone(appName) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    // Use custom message if set, otherwise default
    let message = customNotificationMsg || `${appName} finished.`;
    
    // Replace {app} placeholder with actual app name
    message = message.replace(/{app}/g, appName);
    
    new Notification("Timer done", { body: message });
  }
}

// Alarm audio helper
let currentAlarmAudio = null;
function stopAlarm() {
  if (!currentAlarmAudio) return;
  currentAlarmAudio.pause();
  currentAlarmAudio.currentTime = 0;
  
  // Call cleanup if it exists
  if (currentAlarmAudio.cleanup) {
    currentAlarmAudio.cleanup();
  }
  
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
  let remainingSeconds = totalSeconds;
  let intervalId = null;
  let isPaused = false;
  let finished = false;
  let stopped = false;  // ← ADD THIS

  const finish = () => {
    if (finished || stopped) return true;  // ← CHECK stopped flag
    finished = true;
    displayEl.textContent = "Done!";
    onDone?.();
    return true;
  };

  const render = () => {
    if (stopped) return true;  // ← ADD THIS CHECK
    if (remainingSeconds <= 0) return finish();
    displayEl.textContent = `Remaining: ${formatRemaining(remainingSeconds, "clock")}`;
    return false;
  };

  const tick = () => {
    if (isPaused || stopped) return;  // ← ADD stopped check here too
    remainingSeconds--;
    if (render()) {
      clearInterval(intervalId);
    }
  };

  // Initial render
  render();

  // Start the interval
  intervalId = setInterval(tick, 1000);

  // Return control object
  return {
    pause: () => {
      isPaused = true;
    },
    resume: () => {
      isPaused = false;
    },
    stop: () => {
      stopped = true;  // ← SET THE FLAG
      clearInterval(intervalId);
    },
    isPaused: () => isPaused,
    isFinished: () => finished
  };
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

// Check if user selected a custom sound for this timer
if (mode === "upload") {
  const file = timerSoundInput?.files?.[0];
  if (file) {
    soundLabel = file.name;
    soundType = "upload";
    soundData = file;
  }
} else if (mode === "default" && defaultSound && defaultSound.type === "upload") {
  // Use saved default sound if available
  soundLabel = defaultSound.name;
  soundType = "defaultUpload";
  soundData = defaultSound.data;
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

// Create BOTH buttons
const pauseBtn = document.createElement("button");
pauseBtn.type = "button";
pauseBtn.textContent = "Pause";

const stopBtn = document.createElement("button");
stopBtn.type = "button";
stopBtn.textContent = "Stop";

card.appendChild(headerRow);
card.appendChild(soundLine);
card.appendChild(time);
card.appendChild(actions);
actions.appendChild(pauseBtn);  // ← Add pause button FIRST
actions.appendChild(stopBtn);   // ← Then stop button

timersList.appendChild(card);

// Start countdown and get controls (no more intervalId variable)
const timerControls = startCountdown(time, totalSeconds, () => {

    notifyTimerDone(appName);
    stopAlarm();

if (soundType === "default") {
  currentAlarmAudio = notificationSound;
  if (currentAlarmAudio) {
    currentAlarmAudio.currentTime = 0;
    currentAlarmAudio.play();
  }
} else if (soundType === "defaultUpload" && soundData) {
  // Play saved default sound (base64 data)
  currentAlarmAudio = new Audio(soundData);
  currentAlarmAudio.play();
} else if (soundType === "upload" && soundData) {
  const url = URL.createObjectURL(soundData);
  currentAlarmAudio = new Audio(url);
  
  // Revoke on BOTH ended AND when stopped
  const cleanup = () => URL.revokeObjectURL(url);
  currentAlarmAudio.addEventListener("ended", cleanup, { once: true });
  
  // Store cleanup function to call in stopAlarm()
  currentAlarmAudio.cleanup = cleanup;
  
  currentAlarmAudio.play();
}




    // remove after short delay so user sees Done!
    setTimeout(() => card.remove(), 800);
  });

  // Pause/Resume button handler
  pauseBtn.addEventListener("click", () => {
    if (timerControls.isPaused()) {
      timerControls.resume();
      pauseBtn.textContent = "Pause";
      card.classList.remove("paused");
      toast("Timer resumed");
    } else {
      timerControls.pause();
      pauseBtn.textContent = "Resume";
      card.classList.add("paused");
      toast("Timer paused");
    }
  });

  // Stop button handler
  stopBtn.addEventListener("click", () => {
    timerControls.stop();
    stopAlarm();
    card.remove();
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

// ============================
// 8) Hamburger Menu
// ============================
const hamburgerBtn = document.getElementById('hamburgerBtn');
const slideMenu = document.getElementById('slideMenu');
const closeBtn = document.getElementById('closeBtn');
const menuOverlay = document.getElementById('menuOverlay');

function openMenu() {
  if (slideMenu) slideMenu.classList.add('active');
  if (menuOverlay) menuOverlay.classList.add('active');
  if (hamburgerBtn) hamburgerBtn.classList.add('active');
  document.body.classList.add('menu-open');
}

function closeMenu() {
  if (slideMenu) slideMenu.classList.remove('active');
  if (menuOverlay) menuOverlay.classList.remove('active');
  if (hamburgerBtn) hamburgerBtn.classList.remove('active');
  document.body.classList.remove('menu-open');
}

if (hamburgerBtn) {
  hamburgerBtn.addEventListener('click', openMenu);
}

if (closeBtn) {
  closeBtn.addEventListener('click', closeMenu);
  console.log('Close button listener attached!'); // Debug line
}

if (menuOverlay) {
  menuOverlay.addEventListener('click', closeMenu);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && slideMenu?.classList.contains('active')) {
    closeMenu();
  }
});

// ============================
// 9) Settings Page Toggle
// ============================
const settingsLink = document.getElementById('settingsLink');
const homeLink = document.getElementById('homeLink');
const settingsPage = document.getElementById('settingsPage');
const mainContent = document.querySelector('.main');

function showSettings() {
  if (mainContent) mainContent.style.display = 'none';
  if (settingsPage) settingsPage.classList.add('active');
  closeMenu();
}

function showTimer() {
  if (mainContent) mainContent.style.display = 'flex';
  if (settingsPage) settingsPage.classList.remove('active');
  closeMenu();
}

if (settingsLink) {
  settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSettings();
  });
}

if (homeLink) {
  homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    showTimer();
  });
}

// Settings page functionality
const testNotificationBtn = document.getElementById('testNotification');
if (testNotificationBtn) {
  testNotificationBtn.addEventListener('click', () => {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', { body: 'Your notifications are working!' });
      toast('Test notification sent!');
    } else {
      toast('Please enable notifications first');
    }
  });
}

const clearAllPresetsBtn = document.getElementById('clearAllPresets');
if (clearAllPresetsBtn) {
  clearAllPresetsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all saved timers?')) {
      presets = [];
      savePresets(presets);
      renderPresets();
      toast('All saved timers cleared');
    }
  });
}

// ============================
// 10) Default Sound Settings
// ============================
const DEFAULT_SOUND_KEY = "app_timer_default_sound_v1";
let defaultSound = null;

// Load saved default sound
function loadDefaultSound() {
  try {
    const saved = localStorage.getItem(DEFAULT_SOUND_KEY);
    if (saved) {
      defaultSound = JSON.parse(saved);
      updateDefaultSoundDisplay();
    }
  } catch (e) {
    console.error('Error loading default sound:', e);
  }
}

// Save default sound
function saveDefaultSound(soundData) {
  try {
    localStorage.setItem(DEFAULT_SOUND_KEY, JSON.stringify(soundData));
    defaultSound = soundData;
    updateDefaultSoundDisplay();
    toast('Default sound saved!');
  } catch (e) {
    console.error('Error saving default sound:', e);
    toast('Error saving sound');
  }
}

// Update display
function updateDefaultSoundDisplay() {
  const display = document.getElementById('currentDefaultSound');
  if (display && defaultSound) {
    display.textContent = `Current: ${defaultSound.name}`;
  }
}

// Settings UI handling
const defaultSoundModeSelect = document.getElementById('defaultSoundMode');
const defaultSoundUploadDiv = document.getElementById('defaultSoundUpload');
const defaultSoundFileInput = document.getElementById('defaultSoundFile');
const saveDefaultSoundBtn = document.getElementById('saveDefaultSound');

if (defaultSoundModeSelect) {
  defaultSoundModeSelect.addEventListener('change', (e) => {
    if (defaultSoundUploadDiv) {
      defaultSoundUploadDiv.style.display = e.target.value === 'upload' ? 'block' : 'none';
    }
  });
}

if (saveDefaultSoundBtn && defaultSoundFileInput) {
  saveDefaultSoundBtn.addEventListener('click', () => {
    const file = defaultSoundFileInput.files?.[0];
    if (!file) {
      toast('Please select a file first');
      return;
    }
    
    // Check file size (limit to 2MB for localStorage)
    const maxSize = 1.5 * 1024 * 1024; // 1.5MB max to stay under 2MB when encoded
    if (file.size > maxSize) {
      toast('File too large! Please use a file under 1.5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        saveDefaultSound({
          name: file.name,
          data: e.target.result,
          type: 'upload'
        });
      } catch (err) {
        console.error('Save error:', err);
        toast('File too large for storage. Try a smaller file.');
      }
    };
    reader.readAsDataURL(file);
  });
}


// Initialize
loadDefaultSound();



// ============================
// 11) Custom Notification Message
// ============================
const NOTIFICATION_MSG_KEY = "app_timer_notification_msg_v1";

// Load saved notification message
function loadNotificationMsg() {
  try {
    const saved = localStorage.getItem(NOTIFICATION_MSG_KEY);
    if (saved) {
      customNotificationMsg = saved;
      const input = document.getElementById('customNotificationMsg');
      if (input) input.value = saved;
    }
  } catch (e) {
    console.error('Error loading notification message:', e);
  }
}

// Save notification message
function saveNotificationMsg(msg) {
  try {
    localStorage.setItem(NOTIFICATION_MSG_KEY, msg);
    customNotificationMsg = msg;
    toast('Notification message saved!');
  } catch (e) {
    console.error('Error saving notification message:', e);
    toast('Error saving message');
  }
}

// Save button handler
const saveNotificationMsgBtn = document.getElementById('saveNotificationMsg');
const customNotificationMsgInput = document.getElementById('customNotificationMsg');

if (saveNotificationMsgBtn && customNotificationMsgInput) {
  saveNotificationMsgBtn.addEventListener('click', () => {
    const msg = customNotificationMsgInput.value.trim();
    saveNotificationMsg(msg);
  });
}

// Initialize (add to existing initialization)
loadNotificationMsg();

// ============================
// 12) Custom Fluid Cursor Effect
// ============================
const canvas = document.getElementById('fluidCanvas');

if (canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const particleCount = 100;
  let hue = 0;

  class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 25 + 10;  // BIGGER particles
    this.speedX = Math.random() * 4 - 2;
    this.speedY = Math.random() * 4 - 2;
    this.color = `hsl(${hue}, 100%, 60%)`;  // BRIGHTER colors
    this.life = 150;  // Live LONGER
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life -= 1;
    if (this.size > 0.5) this.size -= 0.15;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life / 150;  // Fade slower
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Add glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}


  let mouse = { x: null, y: null };

  canvas.addEventListener('mousemove', (e) => {
  mouse.x = e.x;
  mouse.y = e.y;
  
  for (let i = 0; i < 5; i++) {  // CREATE MORE particles (was 3)
    particles.push(new Particle(mouse.x, mouse.y));
  }
  
  hue += 2;
  if (hue > 360) hue = 0;
});


  function animate() {
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;

    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();

      if (particles[i].life <= 0 || particles[i].size <= 0.3) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > particleCount) {
      particles.splice(0, particles.length - particleCount);
    }

    requestAnimationFrame(animate);
  }

  animate();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  console.log('Custom fluid effect initialized!');
}
