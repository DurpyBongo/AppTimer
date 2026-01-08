const permissionSection = document.getElementById("permissionSection");
const requestPermissionBtn = document.getElementById("requestPermissionBtn");

const timerForm = document.getElementById("timerForm");
const appNameInput = document.getElementById("appName");
const hoursInput = document.getElementById("hours");
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");
const timerSoundInput = document.getElementById("timerSound");

const timersList = document.getElementById("timersList");

requestPermissionBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) return;

  await Notification.requestPermission();
});

timerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  console.log("Form submitted!");
});

timerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const appName = appNameInput.value.trim();
  const hours = parseInt(hoursInput.value, 10) || 0;
  const minutes = parseInt(minutesInput.value, 10) || 0;
  const seconds = parseInt(secondsInput.value, 10) || 0;

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  const soundFile = timerSoundInput.files && timerSoundInput.files[0]; // optional file

  console.log({ appName, totalSeconds, soundFile });
});

function addTimerToList(appName, totalSeconds) {
  const item = document.createElement("div");
  item.className = "timer-card";
  item.textContent = `${appName} - ${totalSeconds}s`;

  timersList.appendChild(item);
}

timerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const appName = appNameInput.value.trim();
  const totalSeconds =
    (parseInt(hoursInput.value, 10) || 0) * 3600 +
    (parseInt(minutesInput.value, 10) || 0) * 60 +
    (parseInt(secondsInput.value, 10) || 0);

  addTimerToList(appName, totalSeconds);
});

function startCountdown(displayEl, seconds) {
  let remaining = seconds;

  displayEl.textContent = `Remaining: ${remaining}s`;

  const intervalId = setInterval(() => {
    remaining -= 1;
    displayEl.textContent = `Remaining: ${remaining}s`;

    if (remaining <= 0) {
      clearInterval(intervalId);
      displayEl.textContent = "Done!";
    }
  }, 1000);
}

timerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const appName = appNameInput.value.trim();
  const totalSeconds =
    (parseInt(hoursInput.value, 10) || 0) * 3600 +
    (parseInt(minutesInput.value, 10) || 0) * 60 +
    (parseInt(secondsInput.value, 10) || 0);

  const card = document.createElement("div");
  card.className = "timer-card";

  const title = document.createElement("div");
  title.textContent = appName;

  const time = document.createElement("div");
  card.appendChild(title);
  card.appendChild(time);

  timersList.appendChild(card);

  startCountdown(time, totalSeconds);
});

