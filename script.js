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

// Used later for "default sound" if you add it
const notificationSound = document.getElementById("notificationSound");

// ============================
// 2) Notification permission
// ============================
requestPermissionBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) return;
  await Notification.requestPermission();
});

// ============================
// 3) Sound mode UI (show/hide)
// ============================
function getSoundMode() {
  if (soundModeUpload.checked) return "upload";
  if (soundModeBrowse.checked) return "browse";
  return "default";
}

function updateSoundModeUI() {
  const mode = getSoundMode();

  // Show the one that matches; hide the others
  uploadSoundSection.style.display = mode === "upload" ? "block" : "none";
  browseSoundSection.style.display = mode === "browse" ? "block" : "none";
}

// Update whenever radio selection changes
soundModeDefault.addEventListener("change", updateSoundModeUI);
soundModeUpload.addEventListener("change", updateSoundModeUI);
soundModeBrowse.addEventListener("change", updateSoundModeUI);

// ============================
// 4) Browse sounds (Freesound)
// ============================
// Put your Freesound API token here later.
// You need it to call the API. [web:212][web:215]
const FREESOUND_TOKEN = ""; // <-- add later

let selectedBrowseSound = null; // { name, previewUrl }

function setStatus(msg) {
  soundStatus.textContent = msg;
}

function clearBrowseResults() {
  soundResults.innerHTML = "";
}

function setPreview(url) {
  // Load preview URL into the audio player
  soundPreviewPlayer.src = url || "";
  if (!url) soundPreviewPlayer.removeAttribute("src");
  soundPreviewPlayer.load();
}

async function searchFreesound(query) {
  if (!FREESOUND_TOKEN) {
    setStatus("Add your Freesound API token in script.js to enable searching.");
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
    headers: {
      Authorization: `Token ${FREESOUND_TOKEN}`
    }
  }); // fetch() returns a Promise for a Response [web:267]

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

    // Freesound preview fields usually include multiple sizes; try common ones
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
    });

    row.appendChild(name);
    row.appendChild(previewBtn);
    row.appendChild(selectBtn);
    soundResults.appendChild(row);
  });
}

soundSearchBtn.addEventListener("click", async () => {
  const query = soundSearchInput.value.trim();
  if (!query) {
    setStatus("Type a search term first (ex: alarm).");
    return;
  }

  const results = await searchFreesound(query);
  renderBrowseResults(results);
});

// ============================
// 5) Timer creation + countdown
// ============================
function toInt(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

function getTotalSeconds() {
  const h = toInt(hoursInput.value);
  const m = toInt(minutesInput.value);
  const s = toInt(secondsInput.value);
  return h * 3600 + m * 60 + s;
}

function startCountdown(displayEl, seconds, onDone) {
  let remaining = seconds;
  displayEl.textContent = `Remaining: ${remaining}s`;

  const intervalId = setInterval(() => {
    remaining -= 1;
    displayEl.textContent = `Remaining: ${remaining}s`;

    if (remaining <= 0) {
      clearInterval(intervalId); // stop repeating interval [web:264][web:159]
      displayEl.textContent = "Done!";
      onDone?.();
    }
  }, 1000); // run every 1000ms [web:159]

  return intervalId;
}

timerForm.addEventListener("submit", (event) => {
  event.preventDefault(); // stop normal form submission [web:137]

  const appName = appNameInput.value.trim();
  const totalSeconds = getTotalSeconds();
  const mode = getSoundMode();

  if (!appName) return;
  if (totalSeconds <= 0) return;

  // Decide what sound is attached to this timer (store label + how to play later)
  let soundLabel = "Default";
  let soundType = "default";
  let soundData = null;

  if (mode === "upload") {
    const file = timerSoundInput.files && timerSoundInput.files[0];
    if (file) {
      soundLabel = file.name;
      soundType = "upload";
      soundData = file; // will convert to object URL later when playing
    } else {
      soundLabel = "Default";
      soundType = "default";
    }
  }

  if (mode === "browse") {
    if (selectedBrowseSound && selectedBrowseSound.previewUrl) {
      soundLabel = selectedBrowseSound.name;
      soundType = "browse";
      soundData = selectedBrowseSound.previewUrl; // preview URL
    } else {
      soundLabel = "Default";
      soundType = "default";
    }
  }

  // Build a timer card
  const card = document.createElement("div");
  card.className = "timer-card";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = appName;

  const soundLine = document.createElement("div");
  soundLine.className = "sound";
  soundLine.textContent = `Sound: ${soundLabel}`;

  const time = document.createElement("div");
  time.className = "time";

  card.appendChild(title);
  card.appendChild(soundLine);
  card.appendChild(time);

  timersList.appendChild(card);

  // Countdown (for now: just text; later you can trigger notification + sound)
  startCountdown(time, totalSeconds, () => {
    // Placeholder: later you’ll actually play:
    // - default => notificationSound.play()
    // - upload => URL.createObjectURL(file) then play
    // - browse => play preview URL
  });

  // Optional reset
  timerForm.reset();
  hoursInput.value = 0;
  minutesInput.value = 0;
  secondsInput.value = 0;

  // Keep browse selection (so user can add multiple timers with same browsed sound)
  updateSoundModeUI();
});

// ============================
// 6) Init
// ============================
updateSoundModeUI();
setStatus("Choose Browse to search and preview sounds.");
