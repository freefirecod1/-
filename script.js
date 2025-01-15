document.addEventListener('DOMContentLoaded', () => {
    // Page content templates
    const pages = {
        views: `
            <div class="container">
                <h1>زيادة مشاهدات يوتيوب</h1>
                <div class="input-group">
                    <label for="videoUrl">رابط الفيديو:</label>
                    <div class="input-wrapper">
                        <input type="text" id="videoUrl" placeholder="مثال: https://www.youtube.com/watch?v=..." dir="ltr">
                        <div class="input-hint">يمكنك نسخ الرابط مباشرة من يوتيوب</div>
                    </div>
                </div>
                <div class="input-group">
                    <label for="windowCount">عدد المشغلات:</label>
                    <div class="input-wrapper">
                        <input type="number" id="windowCount" value="10" min="1" max="100">
                        <div class="input-hint">أقصى عدد مسموح به هو 100 مشغل</div>
                    </div>
                </div>
                <div class="button-group">
                    <button id="startButton" class="primary-button">
                        <svg class="play-icon" viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M8 5v14l11-7z"/>
                        </svg>
                        بدء المشاهدة
                    </button>
                    <button id="stopButton" class="stop-button" disabled>
                        <svg class="stop-icon" viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M6 6h12v12H6z"/>
                        </svg>
                        إيقاف
                    </button>
                </div>
                <div id="videoContainer" class="video-container"></div>
                <div id="openWindowsCount" class="open-windows-count">0</div>
            </div>
        `,
        points: `
            <div class="container">
                <h1>نظام النقاط</h1>
                <div class="points-display">
                    <svg class="points-icon" viewBox="0 0 24 24" width="24" height="24">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    </svg>
                    <span>النقاط الحالية: <span id="currentPoints">0</span></span>
                </div>
                <div class="ad-container">
                    <div class="ad-placeholder">
                        <p>مساحة إعلانية</p>
                        <button id="watchAdButton" class="watch-ad-button">
                            <svg class="ad-icon" viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M21.65 7.65l-2.79-2.79c-.32-.32-.86-.1-.86.35v1.79H3c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h15v1.79c0 .45.54.67.85.35l2.79-2.79c.2-.19.2-.51.01-.7zM20 13H4V9h16v4z"/>
                            </svg>
                            مشاهدة إعلان
                        </button>
                    </div>
                </div>
                <button id="convertPoints" class="convert-button" disabled>
                    تحويل النقاط إلى مشاهدات
                </button>
            </div>
        `,
        stats: `
            <div class="container">
                <h1>الإحصائيات</h1>
                <div class="stats-container">
                    <div class="stat-card">
                        <div class="stat-title">المشاهدات المضافة</div>
                        <div class="stat-value" id="totalViews">0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">النقاط المستخدمة</div>
                        <div class="stat-value" id="usedPoints">0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-title">المشاهدات النشطة</div>
                        <div class="stat-value" id="activeViews">0</div>
                    </div>
                </div>
            </div>
        `
    };

    // State management with localStorage persistence
    let currentPoints = parseInt(localStorage.getItem('currentPoints')) || 0;
    let activeVideos = parseInt(localStorage.getItem('activeVideos')) || 0;
    let totalViewsCount = parseInt(localStorage.getItem('totalViewsCount')) || 0;
    let usedPointsCount = parseInt(localStorage.getItem('usedPointsCount')) || 0;
    let isPlaying = false;
    let videoAdditionInterval = null;
    let serviceWorkerRegistration = null;

    // Function to save state
    function saveState() {
        localStorage.setItem('currentPoints', currentPoints);
        localStorage.setItem('activeVideos', activeVideos);
        localStorage.setItem('totalViewsCount', totalViewsCount);
        localStorage.setItem('usedPointsCount', usedPointsCount);
    }

    // Navigation handling
    function navigateToPage(pageId) {
        // Update content
        document.getElementById('mainContent').innerHTML = pages[pageId];
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
        
        // Initialize page-specific functionality
        initializePage(pageId);
    }

    // Initialize page-specific functionality
    function initializePage(pageId) {
        switch(pageId) {
            case 'views':
                initializeViewsPage();
                break;
            case 'points':
                initializePointsPage();
                break;
            case 'stats':
                updateStats();
                break;
        }
    }

    // Initialize views page
    function initializeViewsPage() {
        const startButton = document.getElementById('startButton');
        const stopButton = document.getElementById('stopButton');
        const videoUrlInput = document.getElementById('videoUrl');
        const windowCountInput = document.getElementById('windowCount');
        const videoContainer = document.getElementById('videoContainer');
        const openWindowsCount = document.getElementById('openWindowsCount');
        
        if (!startButton || !stopButton || !videoUrlInput || !windowCountInput) return;

        // Check points availability before starting
        function checkPointsAvailability(requestedCount) {
            const requiredPoints = Math.ceil(requestedCount / 10) * 10;
            if (currentPoints < requiredPoints) {
                return false;
            }
            return true;
        }

        startButton.addEventListener('click', () => {
            const videoUrl = videoUrlInput.value;
            const windowCount = parseInt(windowCountInput.value);
            
            if (!videoUrl) {
                showAlert('الرجاء إدخال رابط الفيديو');
                return;
            }

            if (!checkPointsAvailability(windowCount)) {
                showAlert(`عدد النقاط غير كافٍ. تحتاج إلى ${Math.ceil(windowCount / 10) * 10} نقطة`);
                return;
            }

            const videoId = extractVideoId(videoUrl);
            if (!videoId) {
                showAlert('رابط الفيديو غير صحيح');
                return;
            }

            // Deduct points
            const requiredPoints = Math.ceil(windowCount / 10) * 10;
            currentPoints -= requiredPoints;
            usedPointsCount += requiredPoints;
            saveState(); // Save after points deduction
            updatePointsDisplay();

            // Clear existing videos
            clearVideos();

            // Limit maximum players
            const actualCount = Math.min(windowCount, 100);
            let currentCount = 0;
            
            isPlaying = true;
            startButton.disabled = true;
            stopButton.disabled = false;

            // Start background playback
            if (serviceWorkerRegistration) {
                serviceWorkerRegistration.active.postMessage({
                    type: 'START_PLAYBACK',
                    videoId: videoId,
                    count: actualCount
                });
            }

            videoAdditionInterval = setInterval(() => {
                if (currentCount < actualCount && isPlaying) {
                    createVideoPlayer(videoId);
                    currentCount++;
                    totalViewsCount++;
                    updateStats();
                } else {
                    if (!serviceWorkerRegistration) {
                        stopPlaying();
                    }
                }
            }, 500);
        });

        stopButton.addEventListener('click', () => {
            clearVideos();
            stopPlaying();
        });
    }

    // Initialize points page
    function initializePointsPage() {
        const watchAdButton = document.getElementById('watchAdButton');
        const currentPointsDisplay = document.getElementById('currentPoints');
        
        if (!watchAdButton) return;

        watchAdButton.addEventListener('click', () => {
            if (watchAdButton.disabled) return;
            
            // Simulate ad availability check
            const adAvailable = Math.random() > 0.3; // 70% chance of ad being available
            
            if (!adAvailable) {
                showAlert('عذراً، لا يوجد إعلان متاح حالياً. الرجاء المحاولة لاحقاً');
                return;
            }

            watchAdButton.disabled = true;
            watchAdButton.classList.add('loading');
            watchAdButton.innerHTML = `
              <svg class="loading-icon" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8z">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
              جاري عرض الإعلان...
            `;
            
            // Simulate 5-second ad
            setTimeout(() => {
                currentPoints++;
                saveState(); // Save after points change
                
                // Animate points display safely
                const pointsElement = document.getElementById('currentPoints');
                if (pointsElement) {
                    pointsElement.classList.add('points-earned-animation');
                    setTimeout(() => pointsElement.classList.remove('points-earned-animation'), 500);
                }
                
                updatePointsDisplay();
                
                if (watchAdButton) {
                    watchAdButton.disabled = false;
                    watchAdButton.classList.remove('loading');
                    watchAdButton.innerHTML = `
                      <svg class="ad-icon" viewBox="0 0 24 24" width="24" height="24">
                        <path fill="currentColor" d="M21.65 7.65l-2.79-2.79c-.32-.32-.86-.1-.86.35v1.79H3c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h15v1.79c0 .45.54.67.85.35l2.79-2.79c.2-.19.2-.51.01-.7zM20 13H4V9h16v4z"/>
                      </svg>
                      مشاهدة إعلان
                    `;
                }

                showPointsEarnedNotification();
            }, 5000);
        });
    }

    function showPointsEarnedNotification() {
        const notification = document.createElement('div');
        notification.className = 'points-notification';
        notification.innerHTML = `
            <svg class="points-icon" viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            </svg>
            <span>+1 نقطة</span>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    // Update points display
    function updatePointsDisplay() {
        const currentPointsElements = document.querySelectorAll('[id="currentPoints"]');
        currentPointsElements.forEach(element => {
            if (element) {
                element.textContent = currentPoints;
            }
        });
        
        const convertButton = document.getElementById('convertPoints');
        if (convertButton) {
            convertButton.disabled = currentPoints < 10;
        }
        
        saveState(); // Save after any points update
    }

    // Update the stats with persistence
    function updateStats() {
        const totalViewsElement = document.getElementById('totalViews');
        const usedPointsElement = document.getElementById('usedPoints');
        const activeViewsElement = document.getElementById('activeViews');
        
        if (totalViewsElement) {
            totalViewsElement.textContent = totalViewsCount;
        }
        if (usedPointsElement) {
            usedPointsElement.textContent = usedPointsCount;
        }
        if (activeViewsElement) {
            activeViewsElement.textContent = activeVideos;
        }
        
        saveState(); // Save after stats update
    }

    // Create video player
    function createVideoPlayer(videoId) {
        const wrapper = document.createElement('div');
        wrapper.className = 'video-wrapper';
        
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        
        wrapper.appendChild(iframe);
        document.getElementById('videoContainer').appendChild(wrapper);
        
        activeVideos++;
        document.getElementById('openWindowsCount').textContent = activeVideos;
    }

    // Clear videos with persistence
    function clearVideos() {
        document.getElementById('videoContainer').innerHTML = '';
        activeVideos = 0;
        document.getElementById('openWindowsCount').textContent = activeVideos;
        saveState(); // Save after clearing videos
    }

    // Stop playing
    function stopPlaying() {
        if (videoAdditionInterval) {
            clearInterval(videoAdditionInterval);
            videoAdditionInterval = null;
        }
        isPlaying = false;
        document.getElementById('startButton').disabled = false;
        document.getElementById('stopButton').disabled = true;

        // Stop background playback
        if (serviceWorkerRegistration) {
            serviceWorkerRegistration.active.postMessage({
                type: 'STOP_PLAYBACK'
            });
        }
    }

    function showAlert(message) {
        const alert = document.createElement('div');
        alert.className = 'alert-notification';
        alert.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>${message}</span>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }

    // Extract video id
    function extractVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    // Register ServiceWorker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                serviceWorkerRegistration = registration;
            })
            .catch(console.error);
    }

    // Initialize navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.dataset.page;
            navigateToPage(pageId);
        });
    });

    // Add window unload handler to save state
    window.addEventListener('beforeunload', () => {
        saveState();
    });

    // Start with views page and load saved state
    navigateToPage('views');
    updatePointsDisplay();
    updateStats();
});