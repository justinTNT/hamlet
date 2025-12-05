export async function collectFingerprintData() {
    return {
        canvas: await getCanvasFingerprint(),
        webgl: await getWebGLFingerprint(),
        fonts: await getFontMetrics(),
        performance: getPerformanceFingerprint()
    };
}

async function getCanvasFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Render complex scene to expose hardware differences
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint 🔒', 2, 2);
    ctx.fillStyle = 'rgba(255,0,0,0.5)';
    ctx.fillRect(0, 0, 100, 50);

    return canvas.toDataURL();
}

async function getWebGLFingerprint() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';

    return {
        renderer: gl.getParameter(gl.RENDERER),
        vendor: gl.getParameter(gl.VENDOR),
        extensions: gl.getSupportedExtensions(),
        params: {
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
        }
    };
}

async function getFontMetrics() {
    const fonts = ['Arial', 'Times', 'Courier', 'Helvetica', 'Georgia'];
    const metrics = {};

    for (const font of fonts) {
        const span = document.createElement('span');
        span.style.font = `16px ${font}`;
        span.textContent = 'mmmmmmmmmmlli';
        document.body.appendChild(span);

        metrics[font] = {
            width: span.offsetWidth,
            height: span.offsetHeight
        };

        document.body.removeChild(span);
    }

    return metrics;
}


function getPerformanceFingerprint() {
    const start = performance.now();
    // CPU-intensive operation to expose hardware differences
    let result = 0;
    for (let i = 0; i < 100000; i++) {
        result += Math.sin(i) * Math.cos(i);
    }
    const duration = performance.now() - start;

    return {
        timing: duration,
        memory: performance.memory ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize
        } : null,
        navigation: performance.navigation ? performance.navigation.type : null
    };
}
