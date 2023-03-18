let storageLocal = chrome.storage.local || browser.storage.local;
let runtime = chrome.runtime || browser.runtime;

console.log(storageLocal);

const sidInput = document.getElementById("sid-inp");
const sidButton = document.getElementById("save-sid");
const delButton = document.getElementById("delete-sid");

let userId = null;

function parseSid(sid) {
  if (sid[1] != ":") {
    return decodeURIComponent(sid);
  }
  return sid;
}

sidButton.addEventListener("click", (e) => {
  const sid = parseSid(sidInput.value);

  // check if the SID is correct
  fetch("https://xl-replit-backend.luisafk.repl.co/checkSid", {
    method: "POST",
    body: sid,
    headers: {
      "Content-Type": "text/plain",
    },
  })
    .then((r) => r.text())
    .then((resp) => {
      const isValid = resp[0] == "1";

      console.log("[XL] SID valid:", isValid);

      sidInput.dataset.valid = isValid;

      if (isValid) {
        storageLocal
          .set({
            sid,
          })
          .then(() => {
            console.log("[XL] Saved SID to local CRX storage");
          });
      }
    });
});

delButton.addEventListener("click", (e) => {
  storageLocal
    .set({
      sid: "",
    })
    .then(() => {
      console.log("[XL] Deleted SID from CRX storage");
      window.location.reload();
    });
});

// get stored user ID and SID
storageLocal.get(["userId", "sid"]).then(({ userId: storedUserId, sid }) => {
  if (storedUserId) {
    sidInput.disabled = false;
    sidButton.disabled = false;
    userId = storedUserId;
    console.debug("[XL] Got user ID from storage:", userId);
  }

  if (sid) {
    console.debug("[XL] Got SID from storage");
    sidInput.value = sid;
  }
});
