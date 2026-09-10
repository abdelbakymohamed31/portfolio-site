document.addEventListener('DOMContentLoaded', () => {

    // 1. Load Content from API
    loadContentFromAPI();

    // 2. Scroll Reveal Animation
    setupScrollReveal();

    // 3. Handle Review Form
    setupReviewForm();

    // 4. Setup YouTube Video Manager (stop other videos when one plays)
    setTimeout(() => setupVideoManager(), 1000); // Wait for content to load

    // 5. Setup Slow Smooth Scroll
    setupSlowSmoothScroll();
});

// Helper function to extract clean 11-char YouTube ID from any format
function extractYouTubeId(input) {
    if (!input) return '';
    const str = String(input).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
        return str;
    }
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = str.match(regex);
    return match ? match[1] : '';
}

async function loadContentFromAPI() {
    try {
        // 1. Get Hero Video settings (strictly from Firestore settings/hero, no default fallbacks)
        let heroVideo = '';
        try {
            const heroDoc = await db.collection('settings').doc('hero').get();
            if (heroDoc.exists && heroDoc.data()) {
                const hData = heroDoc.data();
                heroVideo = hData.youtubeId || hData.videoUrl || hData.url || '';
            }
        } catch (err) {
            console.log('Error fetching hero video setting:', err);
        }

        // Load Hero Video (Only if added in control panel)
        const heroVideoPlayer = document.getElementById('hero-video-player');
        if (heroVideoPlayer) {
            if (!heroVideo) {
                heroVideoPlayer.innerHTML = '';
            } else if (heroVideo.startsWith('/uploads/') || heroVideo.endsWith('.mp4') || heroVideo.includes('cloudinary.com')) {
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
                // YouTube Video added by user in control panel
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
                } else {
                    heroVideoPlayer.innerHTML = '';
                }
            }
        }

        // 2. Fetch user portfolio items strictly from Firestore (No default mocks)
        const data = {
            montage: [], reels: [], motionGraphics: [], graphicDesign: [], thumbnails: [], webDesign: []
        };

        try {
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
        } catch (err) {
            console.log('Error fetching user portfolio items:', err);
        }

        // Sort items by custom order index if set, or fallback to createdAt
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

        // Update section display based on item count
        const sectionMap = {
            montage: 'montage',
            reels: 'reels',
            motionGraphics: 'motion-graphics',
            graphicDesign: 'graphic-design',
            thumbnails: 'thumbnails',
            webDesign: 'web-design'
        };

        Object.keys(sectionMap).forEach(cat => {
            const secEl = document.getElementById(sectionMap[cat]);
            if (secEl) {
                if (data[cat] && data[cat].length > 0) {
                    secEl.style.display = 'block';
                } else {
                    secEl.style.display = 'none';
                }
            }
        });

        // Setup all carousel navigations
        setupAllCarousels();

    } catch (error) {
        console.error('Error loading content:', error);
    }
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
            // In a real app, this would send data to a server.
            // Here we just simulate success.
            const nameDisplay = document.getElementById('user-name-display');
            const name = nameDisplay ? nameDisplay.innerText : "زائر";

            alert(`شكراً لك يا ${name} !تم إرسال تعليقك وسيظهر بعد المراجعة.`);
            form.reset();
            // Restore view
            document.getElementById('review-auth-section').style.display = 'block';
            document.getElementById('review-form-container').classList.add('hidden');
        });
    }
}

// Simulate Google Login
function simulateGoogleLogin() {
    // Hide Auth Button
    const authSection = document.getElementById('review-auth-section');
    authSection.style.display = 'none';

    // Show Form
    const formContainer = document.getElementById('review-form-container');
    formContainer.classList.remove('hidden');

    // Force Flex because CSS might override
    formContainer.style.display = 'flex';

    // Set Mock User Data
    const mockUser = {
        name: "زائر (تجريبي)", // This would come from Google API in real app
        avatar: "https://ui-avatars.com/api/?name=Visitor&background=random"
    };

    document.getElementById('user-name-display').innerText = mockUser.name;
    document.getElementById('user-avatar').src = mockUser.avatar;
}

// Video Manager - Stop other videos when one plays (supports both HTML5 video and YouTube iframes)
function setupVideoManager() {
    // HTML5 Video elements
    const videos = document.querySelectorAll('.card-video video');
    // YouTube iframes (for backwards compatibility with old data)
    const iframes = document.querySelectorAll('iframe[src*="youtube"]');

    // Function to pause a YouTube iframe
    function pauseYouTube(iframe) {
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }

    // Function to pause all media except one
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

    // HTML5 video play handlers
    videos.forEach(video => {
        video.addEventListener('play', function () {
            pauseAllExcept(video);
        });
    });

    // YouTube iframe handlers (backwards compatibility)
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
