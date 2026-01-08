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
