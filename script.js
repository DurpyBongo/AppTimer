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

// Step 4: Read values from the form inputs
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

