// Interactive elements for the showcase
document.addEventListener('DOMContentLoaded', () => {
    // Add small parallax effect to the mockup browser on mouse move to make it dynamic
    const heroVisual = document.querySelector('.hero-visual');
    const mockupBrowser = document.querySelector('.mockup-browser');

    if (heroVisual && mockupBrowser) {
        heroVisual.addEventListener('mousemove', (e) => {
            const rect = heroVisual.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate rotation based on cursor position
            const xRotation = -((y - rect.height / 2) / rect.height) * 10;
            const yRotation = ((x - rect.width / 2) / rect.width) * 10;

            mockupBrowser.style.transform = `rotateX(${xRotation}deg) rotateY(${yRotation}deg)`;
            mockupBrowser.style.transition = 'none';
        });

        heroVisual.addEventListener('mouseleave', () => {
            mockupBrowser.style.transform = `rotateY(-5deg) rotateX(5deg)`;
            mockupBrowser.style.transition = 'transform 0.5s ease';
        });
    }

    // Playable extension showcase — clicking the mock popup's buttons/toggles
    // actually reacts, so the hero looks/feels like the real panel.
    const heroPopup = document.querySelector('.hero-visual .extension-popup');
    const highlightBox = document.querySelector('.mock-highlight-box');

    if (heroPopup) {
        const statusDot = heroPopup.querySelector('.mp-status .mp-dot');
        const captureButtons = heroPopup.querySelectorAll('.mp-main-btn, .mp-action-btn');

        function simulateCapture() {
            if (statusDot) statusDot.style.background = 'var(--success)';
            if (highlightBox) {
                highlightBox.style.borderColor = 'var(--success)';
                highlightBox.style.background = 'rgba(16, 185, 129, 0.1)';
            }
            setTimeout(() => {
                if (statusDot) statusDot.style.background = '';
                if (highlightBox) {
                    highlightBox.style.borderColor = 'var(--accent-primary)';
                    highlightBox.style.background = 'rgba(59, 130, 246, 0.05)';
                }
            }, 1200);
        }

        captureButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => (btn.style.transform = ''), 100);
                simulateCapture();
            });
        });

        heroPopup.querySelectorAll('.mp-toggle-group').forEach((group) => {
            const opts = group.querySelectorAll('.mp-toggle-opt');
            opts.forEach((opt) => {
                opt.addEventListener('click', () => {
                    opts.forEach((o) => o.classList.remove('active'));
                    opt.classList.add('active');
                });
            });
        });
    }

    // Video Loading Logic
    const demoVideo = document.getElementById('demo-video');
    const videoLoader = document.getElementById('video-loader');

    if (demoVideo && videoLoader) {
        // If already loaded (e.g., from cache)
        if (demoVideo.readyState >= 3) {
            handleVideoLoaded();
        } else {
            demoVideo.addEventListener('loadeddata', handleVideoLoaded);
            demoVideo.addEventListener('playing', handleVideoLoaded); // Fallback
        }

        function handleVideoLoaded() {
            videoLoader.style.opacity = '0';
            demoVideo.classList.add('loaded');
            setTimeout(() => {
                videoLoader.style.display = 'none';
            }, 500); // Wait for fade out

            // Cleanup listeners
            demoVideo.removeEventListener('loadeddata', handleVideoLoaded);
            demoVideo.removeEventListener('playing', handleVideoLoaded);
        }
    }
});
