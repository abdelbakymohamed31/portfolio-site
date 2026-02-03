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

async function loadContentFromAPI() {
    try {
        const response = await fetch('/api/content');
        const data = await response.json();

        // Load Reels
        const reelsContainer = document.getElementById('reels-container');
        if (reelsContainer && data.reels) {
            reelsContainer.innerHTML = data.reels.map(item => `
                <div class="card reel-card" onclick="window.open('https://www.youtube.com/shorts/${item.youtubeId}', '_blank')">
                    <div class="card-image placeholder-vertical" style="background-image: url('https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg'); background-size: cover; background-position: center;">
                        <div class="play-overlay"><i class="fa-solid fa-play"></i></div>
                        <span class="card-title">${item.title}</span>
                    </div>
                </div>
            `).join('');
        }

        // Load Motion Graphics
        const motionContainer = document.getElementById('motion-container');
        if (motionContainer && data.motionGraphics) {
            motionContainer.innerHTML = data.motionGraphics.map((item, i) => `
                <div class="card motion-card">
                    <div class="card-video">
                        <iframe id="yt-video-${i}" src="https://www.youtube.com/embed/${item.youtubeId}?enablejsapi=1"
                            title="${item.title}" frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen></iframe>
                    </div>
                </div>
            `).join('');
        }

        // Load Graphic Design
        const designContainer = document.getElementById('design-container');
        if (designContainer && data.graphicDesign) {
            designContainer.innerHTML = data.graphicDesign.map(item => `
                <div class="design-card">
                    <img src="${item.imageUrl}" alt="${item.title}">
                </div>
            `).join('');
        }

        // Load Thumbnails
        const thumbContainer = document.getElementById('thumbnails-container');
        if (thumbContainer && data.thumbnails) {
            thumbContainer.innerHTML = data.thumbnails.map(item => `
                <div class="thumbnail-card">
                    <img src="${item.imageUrl}" alt="${item.title}">
                </div>
            `).join('');
        }

        // Load Web Design
        const webContainer = document.getElementById('web-container');
        if (webContainer && data.webDesign) {
            webContainer.innerHTML = data.webDesign.map(item => `
                <div class="web-card">
                    <img src="${item.imageUrl}" alt="${item.title}">
                    <div class="web-card-title">${item.title}</div>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error('Error loading content:', error);
    }
}

function setupScrollReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe newly added elements too (delay slightly to ensures DOM is ready)
    setTimeout(() => {
        const sections = document.querySelectorAll('.section, .card, .testimonial-card');
        sections.forEach(section => {
            section.classList.add('hidden');
            observer.observe(section);
        });
    }, 100);

    // Initial CSS for reveal
    const style = document.createElement('style');
    style.innerHTML = `
        .hidden { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease - out, transform 0.6s ease - out; }
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

// YouTube Video Manager - Stop other videos when one plays
function setupVideoManager() {
    const iframes = document.querySelectorAll('iframe[src*="youtube"]');

    // Function to pause a YouTube iframe
    function pauseVideo(iframe) {
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }

    // Function to pause all videos except one
    function pauseAllExcept(currentIframe) {
        iframes.forEach(iframe => {
            if (iframe !== currentIframe) {
                pauseVideo(iframe);
            }
        });
    }

    // Listen for messages from YouTube iframes
    window.addEventListener('message', function (event) {
        // Check if it's from YouTube
        if (event.origin === 'https://www.youtube.com') {
            try {
                const data = JSON.parse(event.data);
                // When a video starts playing
                if (data.event === 'onStateChange' && data.info === 1) {
                    // Find which iframe sent this and pause others
                    iframes.forEach(iframe => {
                        if (iframe.contentWindow === event.source) {
                            pauseAllExcept(iframe);
                        }
                    });
                }
            } catch (e) {
                // Ignore parsing errors
            }
        }
    });

    // Add click handlers to video wrappers
    iframes.forEach(iframe => {
        const wrapper = iframe.closest('.card-video') || iframe.closest('.video-wrapper');
        if (wrapper) {
            wrapper.addEventListener('click', function () {
                // Small delay to let the video start, then pause others
                setTimeout(() => {
                    pauseAllExcept(iframe);
                }, 300);
            });
        }

        // Also add listener directly on iframe for when user clicks play button
        iframe.addEventListener('load', function () {
            // Subscribe to YouTube player events
            iframe.contentWindow.postMessage('{"event":"listening"}', '*');
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
