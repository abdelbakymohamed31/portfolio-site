document.addEventListener('DOMContentLoaded', () => {
    // 1. Load Content immediately from Firestore REST API & Fallbacks
    loadContentFromAPI();

    // 2. Scroll Reveal Animation
    setupScrollReveal();

    // 3. Handle Review Form
    setupReviewForm();

    // 4. Setup YouTube Video Manager
    setTimeout(() => setupVideoManager(), 1000);

    // 5. Setup Slow Smooth Scroll
    setupSlowSmoothScroll();
});

// Helper function to extract clean 11-char YouTube ID from any format or URL
function extractYouTubeId(input) {
    if (!input) return '';
    const str = String(input).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
        return str;
    }
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = str.match(regex);
    if (match && match[1]) {
        return match[1];
    }
    return str;
}

// Helper to parse raw Firestore REST API document fields into clean JS object
function parseFirestoreDocFields(doc) {
    if (!doc) return null;
    const id = doc.name ? doc.name.split('/').pop() : '';
    const fields = doc.fields || {};
    const item = { id };

    function parseVal(val) {
        if (!val) return null;
        if (val.stringValue !== undefined) return val.stringValue;
        if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
        if (val.doubleValue !== undefined) return parseFloat(val.doubleValue);
        if (val.booleanValue !== undefined) return val.booleanValue;
        if (val.timestampValue !== undefined) return val.timestampValue;
        return null;
    }

    Object.keys(fields).forEach(key => {
        item[key] = parseVal(fields[key]);
    });
    return item;
}

// Ultra-fast HTTP fetcher directly from Firestore REST API (works everywhere without auth/SDK blocking)
async function fetchFirestoreRest(documentPath) {
    const projectId = "alamerup-new";
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        clearTimeout(timeoutId);
        return null;
    }
}

async function loadContentFromAPI() {
    let heroVideo = '';
    const data = {
        montage: [], reels: [], motionGraphics: [], graphicDesign: [], thumbnails: [], webDesign: []
    };

    // --- STEP 1: Fetch Hero Video ---
    try {
        // Try ultra-fast REST API first
        const heroRestJson = await fetchFirestoreRest('settings/hero');
        if (heroRestJson && heroRestJson.fields) {
            const hObj = parseFirestoreDocFields(heroRestJson);
            if (hObj) heroVideo = hObj.youtubeId || hObj.videoUrl || hObj.url || '';
        }
        
        // Fallback to Firebase SDK if REST API was empty
        if (!heroVideo && typeof db !== 'undefined') {
            const heroDoc = await db.collection('settings').doc('hero').get();
            if (heroDoc.exists && heroDoc.data()) {
                const hData = heroDoc.data();
                heroVideo = hData.youtubeId || hData.videoUrl || hData.url || '';
            }
        }

        // Fallback to local server Express API
        if (!heroVideo) {
            const res = await fetch('/api/content');
            if (res.ok) {
                const apiData = await res.json();
                if (apiData.heroVideo) heroVideo = apiData.heroVideo;
            }
        }
    } catch (e) {
        console.log('Hero fetch error:', e);
    }

    // Render Hero Video
    const heroVideoPlayer = document.getElementById('hero-video-player');
    if (heroVideoPlayer && heroVideo) {
        if (heroVideo.startsWith('/uploads/') || heroVideo.endsWith('.mp4') || heroVideo.includes('cloudinary.com')) {
            heroVideoPlayer.innerHTML = `
                <video id="hero-vid" autoplay loop muted playsinline controls>
                    <source src="${heroVideo}" type="video/mp4">
                    المتصفح لا يدعم تشغيل الفيديو
                </video>
            `;
            const heroVid = document.getElementById('hero-vid');
            if (heroVid) {
                heroVid.play().catch(e => console.log('Autoplay handled:', e));
            }
        } else {
            const yId = extractYouTubeId(heroVideo);
            if (yId) {
                heroVideoPlayer.innerHTML = `
                    <iframe id="hero-yt" 
                        src="https://www.youtube.com/embed/${yId}?autoplay=1&mute=1&loop=1&playlist=${yId}&controls=1&rel=0&enablejsapi=1"
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                `;
            }
        }
    }

    // --- STEP 2: Fetch Portfolio Items ---
    try {
        // Try ultra-fast REST API first
        const restJson = await fetchFirestoreRest('portfolio_items');
        if (restJson && Array.isArray(restJson.documents) && restJson.documents.length > 0) {
            restJson.documents.forEach(doc => {
                const item = parseFirestoreDocFields(doc);
                if (item && item.category && data[item.category]) {
                    data[item.category].push(item);
                }
            });
        }

        // Fallback to Firebase SDK if REST returned 0 items
        const restCount = Object.values(data).reduce((acc, arr) => acc + arr.length, 0);
        if (restCount === 0 && typeof db !== 'undefined') {
            const snapshot = await db.collection('portfolio_items').get();
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const item = doc.data();
                    item.id = doc.id;
                    if (data[item.category]) {
                        data[item.category].push(item);
                    }
                });
            }
        }

        // Fallback to local server Express API if total count is still 0
        const totalCount = Object.values(data).reduce((acc, arr) => acc + arr.length, 0);
        if (totalCount === 0) {
            const res = await fetch('/api/content');
            if (res.ok) {
                const apiData = await res.json();
                Object.keys(data).forEach(cat => {
                    if (apiData[cat] && Array.isArray(apiData[cat])) {
                        data[cat] = apiData[cat];
                    }
                });
            }
        }
    } catch (e) {
        console.log('Portfolio fetch error:', e);
    }

    // Sort items in each category by custom order index if set
    Object.keys(data).forEach(cat => {
        data[cat].sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
            }
            if (a.order !== undefined) return -1;
            if (b.order !== undefined) return 1;
            return 0;
        });
    });

    // Helper renderer for video cards
    function renderVideoCardHtml(item, cardClass, aspectClass, idPrefix, index) {
        const rawUrl = item.videoUrl || item.youtubeId || item.url || '';
        const yId = extractYouTubeId(rawUrl || item.youtubeId);

        if (rawUrl.startsWith('/uploads/') || rawUrl.endsWith('.mp4') || rawUrl.includes('cloudinary.com')) {
            return `
                <div class="card ${cardClass}">
                    <div class="card-video ${aspectClass}">
                        <video controls preload="metadata" playsinline>
                            <source src="${rawUrl}" type="video/mp4">
                            المتصفح لا يدعم تشغيل الفيديو
                        </video>
                    </div>
                    <div class="motion-card-title">${item.title || ''}</div>
                </div>
            `;
        } else if (yId) {
            return `
                <div class="card ${cardClass}">
                    <div class="card-video ${aspectClass}">
                        <iframe id="${idPrefix}-${index}" src="https://www.youtube.com/embed/${yId}?enablejsapi=1&rel=0"
                            title="${item.title || ''}" frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen></iframe>
                    </div>
                    <div class="motion-card-title">${item.title || ''}</div>
                </div>
            `;
        }
        return '';
    }

    // Load Montage (Carousel - horizontal videos)
    const montageContainer = document.getElementById('montage-container');
    if (montageContainer) {
        montageContainer.innerHTML = data.montage.map((item, i) =>
            renderVideoCardHtml(item, 'motion-card montage-card', 'card-video-landscape', 'yt-montage', i)
        ).join('');
    }

    // Load Reels (Carousel - vertical/portrait videos)
    const reelsContainer = document.getElementById('reels-container');
    if (reelsContainer) {
        reelsContainer.innerHTML = data.reels.map((item, i) =>
            renderVideoCardHtml(item, 'reel-card', 'card-video-portrait', 'yt-reel', i)
        ).join('');
    }

    // Load Motion Graphics (Carousel)
    const motionContainer = document.getElementById('motion-container');
    if (motionContainer) {
        motionContainer.innerHTML = data.motionGraphics.map((item, i) =>
            renderVideoCardHtml(item, 'motion-card', 'card-video-landscape', 'yt-video', i)
        ).join('');
    }

    // Load Graphic Design (Carousel)
    const designContainer = document.getElementById('design-container');
    if (designContainer) {
        designContainer.innerHTML = data.graphicDesign.map(item => item.imageUrl ? `
            <div class="design-card carousel-card">
                <img src="${item.imageUrl}" alt="${item.title || ''}">
                <div class="carousel-card-title">${item.title || ''}</div>
            </div>
        ` : '').join('');
    }

    // Load Thumbnails (Carousel)
    const thumbContainer = document.getElementById('thumbnails-container');
    if (thumbContainer) {
        thumbContainer.innerHTML = data.thumbnails.map(item => item.imageUrl ? `
            <div class="thumbnail-card carousel-card">
                <img src="${item.imageUrl}" alt="${item.title || ''}">
            </div>
        ` : '').join('');
    }

    // Load Web Design (Carousel)
    const webContainer = document.getElementById('web-container');
    if (webContainer) {
        webContainer.innerHTML = data.webDesign.map(item => item.imageUrl ? `
            <div class="web-card carousel-card">
                <img src="${item.imageUrl}" alt="${item.title || ''}">
                <div class="web-card-title">${item.title || ''}</div>
            </div>
        ` : '').join('');
    }

    // Setup all carousel navigations
    setupAllCarousels();
}

// Setup all Carousel Navigations
function setupAllCarousels() {
    const carousels = [
        { container: 'montage-container', prev: 'montage-prev', next: 'montage-next', cardWidth: 350 },
        { container: 'reels-container', prev: 'reels-prev', next: 'reels-next', cardWidth: 200 },
        { container: 'motion-container', prev: 'motion-prev', next: 'motion-next', cardWidth: 350 },
        { container: 'design-container', prev: 'design-prev', next: 'design-next', cardWidth: 280 },
        { container: 'thumbnails-container', prev: 'thumbnails-prev', next: 'thumbnails-next', cardWidth: 320 },
        { container: 'web-container', prev: 'web-prev', next: 'web-next', cardWidth: 280 }
    ];

    carousels.forEach(({ container, prev, next, cardWidth }) => {
        const containerEl = document.getElementById(container);
        const prevBtn = document.getElementById(prev);
        const nextBtn = document.getElementById(next);

        if (!containerEl || !prevBtn || !nextBtn) return;

        const scrollAmount = cardWidth + 24; // card width + gap

        prevBtn.addEventListener('click', () => {
            containerEl.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });

        nextBtn.addEventListener('click', () => {
            containerEl.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
    });
}

function setupScrollReveal() {
    const observerOptions = {
        threshold: 0.05,
        rootMargin: "0px 0px 50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    setTimeout(() => {
        const sections = document.querySelectorAll('.section, .testimonial-card');
        sections.forEach(section => {
            section.classList.add('hidden');
            observer.observe(section);
        });
    }, 100);

    const style = document.createElement('style');
    style.innerHTML = `
        .hidden { opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease-out, transform 0.5s ease-out; }
        .visible { opacity: 1; transform: translateY(0); }
    `;
    document.head.appendChild(style);
}

function setupReviewForm() {
    const form = document.querySelector('.review-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameDisplay = document.getElementById('user-name-display');
            const name = nameDisplay ? nameDisplay.innerText : "زائر";

            alert(`شكراً لك يا ${name} !تم إرسال تعليقك وسيظهر بعد المراجعة.`);
            form.reset();
            document.getElementById('review-auth-section').style.display = 'block';
            document.getElementById('review-form-container').classList.add('hidden');
        });
    }
}

// Video Manager - Stop other videos when one plays
function setupVideoManager() {
    const videos = document.querySelectorAll('.card-video video');
    const iframes = document.querySelectorAll('iframe[src*="youtube"]');

    function pauseYouTube(iframe) {
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }

    function pauseAllExcept(currentElement) {
        videos.forEach(video => {
            if (video !== currentElement) {
                video.pause();
            }
        });
        iframes.forEach(iframe => {
            if (iframe !== currentElement) {
                pauseYouTube(iframe);
            }
        });
    }

    videos.forEach(video => {
        video.addEventListener('play', function () {
            pauseAllExcept(video);
        });
    });

    if (iframes.length > 0) {
        window.addEventListener('message', function (event) {
            if (event.origin === 'https://www.youtube.com') {
                try {
                    const data = JSON.parse(event.data);
                    if (data.event === 'onStateChange' && data.info === 1) {
                        iframes.forEach(iframe => {
                            if (iframe.contentWindow === event.source) {
                                pauseAllExcept(iframe);
                            }
                        });
                    }
                } catch (e) { }
            }
        });

        iframes.forEach(iframe => {
            iframe.addEventListener('load', function () {
                iframe.contentWindow.postMessage('{"event":"listening"}', '*');
            });
        });
    }
}

// Slow Smooth Scroll for anchor links
function setupSlowSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const startPosition = window.pageYOffset;
                const targetPosition = targetElement.getBoundingClientRect().top + startPosition - 80;
                const distance = targetPosition - startPosition;
                const duration = 1500;
                let startTime = null;

                function animation(currentTime) {
                    if (startTime === null) startTime = currentTime;
                    const timeElapsed = currentTime - startTime;
                    const progress = Math.min(timeElapsed / duration, 1);

                    const easeInOutCubic = progress < 0.5
                        ? 4 * progress * progress * progress
                        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

                    window.scrollTo(0, startPosition + distance * easeInOutCubic);

                    if (timeElapsed < duration) {
                        requestAnimationFrame(animation);
                    }
                }

                requestAnimationFrame(animation);
            }
        });
    });
}
