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

    // Interactive Extension Buttons logic inside mockup
    const extBtnPrimary = document.querySelector('.ext-btn-primary');
    const highlightBox = document.querySelector('.mock-highlight-box');
    
    if (extBtnPrimary && highlightBox) {
        extBtnPrimary.addEventListener('click', () => {
            // Simulate button click
            extBtnPrimary.style.transform = 'scale(0.95)';
            setTimeout(() => extBtnPrimary.style.transform = 'scale(1)', 100);
            
            // Change status text
            const statusText = document.querySelector('.ext-status');
            if (statusText) {
                statusText.innerHTML = '<span class="dot" style="background:var(--success)"></span>Selecting';
            }
            
            // Trigger animation on highlight box
            highlightBox.style.borderColor = 'var(--success)';
            highlightBox.style.background = 'rgba(16, 185, 129, 0.1)';
            
            setTimeout(() => {
                if (statusText) {
                    statusText.innerHTML = '<span class="dot"></span>Ready';
                }
                highlightBox.style.borderColor = 'var(--accent-primary)';
                highlightBox.style.background = 'rgba(59, 130, 246, 0.05)';
            }, 3000);
        });
    }
});
