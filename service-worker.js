chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, value } = message;

  if (type === 'change-active-sid') {
    chrome.cookies
      .set({
        url: 'https://replit.com',
        httpOnly: true,
        name: 'connect.sid',
        value,
      })
      .then(() => {
        sendResponse(true);
      });
  }
});
