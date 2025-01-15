let videoData = null;
let playbackInterval = null;

self.addEventListener('message', event => {
  if (event.data.type === 'START_PLAYBACK') {
    videoData = event.data;
    startPlayback();
  } else if (event.data.type === 'STOP_PLAYBACK') {
    stopPlayback();
  }
});

function startPlayback() {
  if (videoData) {
    // Continue playback in background
    playbackInterval = setInterval(() => {
      // Keep track of playback status
      self.clients.matchAll().then(clients => {
        if (clients.length === 0) {
          // Page is closed but we continue playback
          console.log('Continuing background playback...');
        }
      });
    }, 1000);
  }
}

function stopPlayback() {
  if (playbackInterval) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }
  videoData = null;
}

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});