document.addEventListener('DOMContentLoaded', () => {

    // 1. Load Content from API / Firestore
    loadContentFromAPI();

    // 2. Scroll Reveal Animation
    setupScrollReveal();

    // 3. Handle Review Form
    setupReviewForm();

    // 4. Setup Video Manager (stop other videos when one plays)
    setTimeout(() => setupVideoManager(), 1500);

    // 5. Setup Slow Smooth Scroll
    setupSlowSmoothScroll();
});

async function loadContentFromAPI() {
    try {
        let heroVideo = '';
        let data = {
            montage: [], reels: [], motionGraphics: [], graphicDesign: [], thumbnails: [], webDesign: []
        };

        // 1. Fetch & Render INSTANTLY from Local Server API if available
        try {
            const res = await fetch('/api/content');
            if (res.ok) {
                const apiData = await res.json();
                if (apiData.heroVideo) heroVideo = apiData.heroVideo;
                Object.keys(data).forEach(cat => {
                    if (apiData[cat] && Array.isArray(apiData[cat])) {
                        data[cat] = apiData[cat];
                    }
                });
                renderHeroVideo(heroVideo);
                renderAllCategories(data);
            }
        } catch (e) {
            console.log('API fetch info:', e);
        }

        // 2. Real-Time Instant Firestore Synchronization (onSnapshot)
        if (typeof db !== 'undefined' && db) {
            // Real-time listener for Hero Video
            db.collection('settings').doc('hero').onSnapshot((heroDoc) => {
                if (heroDoc.exists && heroDoc.data()) {
                    const hData = heroDoc.data();
                    const newHero = hData.videoUrl || hData.youtubeId || hData.url || '';
                    if (newHero && newHero !== heroVideo) {
                        heroVideo = newHero;
                        renderHeroVideo(heroVideo);
                    }
                }
            }, (err) => console.log('Firestore hero listener error:', err));

            // Real-time listener for Portfolio Items (Videos, Reels, Designs, etc.)
            db.collection('portfolio_items').onSnapshot((snapshot) => {
                if (!snapshot.empty) {
                    const fsData = {
                        montage: [], reels: [], motionGraphics: [], graphicDesign: [], thumbnails: [], webDesign: []
                    };
                    snapshot.forEach(doc => {
                        const item = doc.data();
                        item.id = doc.id;
                        if (fsData[item.category]) {
                            fsData[item.category].push(item);
                        }
                    });
                    renderAllCategories(fsData);
                }
            }, (err) => console.log('Firestore items listener error:', err));
        }

    } catch (error) {
        console.error('Error loading content:', error);
    }
}

// Render Hero Video - AUTOPLAY, LOOP, MUTED
function renderHeroVideo(heroVideo) {
    const heroVideoPlayer = document.getElementById('hero-video-player');
    if (!heroVideoPlayer) return;
    if (!heroVideo) {
        heroVideoPlayer.innerHTML = '';
        return;
    }

    // Direct video file (Firebase Storage URL, local upload, or Cloudinary)
    heroVideoPlayer.innerHTML = `
        <video id="hero-vid" autoplay loop muted playsinline>
            <source src="${heroVideo}" type="video/mp4">
            المتصفح لا يدعم تشغيل الفيديو
        </video>
    `;
    const heroVid = document.getElementById('hero-vid');
    if (heroVid) {
        heroVid.play().catch(e => console.log('Autoplay handled:', e));
    }
}

// Render All Categories with strict order sorting
function renderAllCategories(data) {
    // Sort items by order property strictly (0, 1, 2...)
    Object.keys(data).forEach(cat => {
        data[cat].sort((a, b) => {
            const orderA = a.order !== undefined ? Number(a.order) : 999;
            const orderB = b.order !== undefined ? Number(b.order) : 999;
            return orderA - orderB;
        });
    });

    // Helper renderer for video cards - click to play (not autoplay)
    function renderVideoCardHtml(item, cardClass, aspectClass, idPrefix, index) {
        const rawUrl = item.videoUrl || '';

        if (rawUrl) {
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
        }
        return '';
    }

    // Load Montage (Carousel - horizontal videos)
    const montageContainer = document.getElementById('montage-container');
    if (montageContainer) {
        montageContainer.innerHTML = data.montage.map((item, i) =>
            renderVideoCardHtml(item, 'motion-card montage-card', 'card-video-landscape', 'vid-montage', i)
        ).join('');
    }

    // Load Reels (Carousel - vertical/portrait videos)
    const reelsContainer = document.getElementById('reels-container');
    if (reelsContainer) {
        reelsContainer.innerHTML = data.reels.map((item, i) =>
            renderVideoCardHtml(item, 'reel-card', 'card-video-portrait', 'vid-reel', i)
        ).join('');
    }

    // Load Motion Graphics (Carousel)
    const motionContainer = document.getElementById('motion-container');
    if (motionContainer) {
        motionContainer.innerHTML = data.motionGraphics.map((item, i) =>
            renderVideoCardHtml(item, 'motion-card', 'card-video-landscape', 'vid-motion', i)
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

    // Re-setup video manager for new videos
    setTimeout(() => setupVideoManager(), 500);
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

// Simulate Google Login
function simulateGoogleLogin() {
    const authSection = document.getElementById('review-auth-section');
    authSection.style.display = 'none';

    const formContainer = document.getElementById('review-form-container');
    formContainer.classList.remove('hidden');
    formContainer.style.display = 'flex';

    const mockUser = {
        name: "زائر (تجريبي)",
        avatar: "https://ui-avatars.com/api/?name=Visitor&background=random"
    };

    document.getElementById('user-name-display').innerText = mockUser.name;
    document.getElementById('user-avatar').src = mockUser.avatar;
}

// Video Manager - Stop other videos when one plays (HTML5 video only, no YouTube iframes)
function setupVideoManager() {
    const allVideos = document.querySelectorAll('.card-video video');
    
    // When any video plays, pause all others (except hero video)
    allVideos.forEach(video => {
        video.addEventListener('play', function () {
            allVideos.forEach(otherVideo => {
                if (otherVideo !== video) {
                    otherVideo.pause();
                }
            });
        });
    });
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
                const duration = 1500; // 1.5 seconds - slow and smooth
                let startTime = null;

                function animation(currentTime) {
                    if (startTime === null) startTime = currentTime;
                    const timeElapsed = currentTime - startTime;
                    const progress = Math.min(timeElapsed / duration, 1);

                    // Ease-in-out function for smooth animation
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
