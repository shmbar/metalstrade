// Runs once at import time. Polyfills the DOM APIs that pdfjs-dist (used by
// pdf-parse) touches when running under Node. Without these, you get cryptic
// "DOMMatrix is not defined" / "Path2D is not defined" errors as soon as a PDF
// is parsed.
//
// Import this file at the TOP of any route that imports pdf-parse so the
// polyfill is in place before pdfjs-dist module code runs.

if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = class DOMMatrix {
        constructor(init) {
            Object.assign(this, {
                a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
                m11: 1, m12: 0, m13: 0, m14: 0,
                m21: 0, m22: 1, m23: 0, m24: 0,
                m31: 0, m32: 0, m33: 1, m34: 0,
                m41: 0, m42: 0, m43: 0, m44: 1,
                is2D: true, isIdentity: true,
            });
            if (init && typeof init === 'object' && !Array.isArray(init)) {
                Object.assign(this, init);
            } else if (Array.isArray(init) && init.length >= 6) {
                const [a, b, c, d, e, f] = init;
                Object.assign(this, { a, b, c, d, e, f });
            }
        }
        multiply(m) { return m ? new globalThis.DOMMatrix(m) : this; }
        translate() { return this; }
        scale() { return this; }
        rotate() { return this; }
        inverse() { return this; }
        transformPoint(p) {
            return { x: p?.x || 0, y: p?.y || 0, z: p?.z || 0, w: p?.w || 1 };
        }
    };
}

if (typeof globalThis.Path2D === 'undefined') {
    globalThis.Path2D = class Path2D {
        constructor() { this.ops = []; }
        addPath() { }
        closePath() { }
        moveTo() { }
        lineTo() { }
        bezierCurveTo() { }
        quadraticCurveTo() { }
        arc() { }
        arcTo() { }
        ellipse() { }
        rect() { }
        roundRect() { }
    };
}

if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = class ImageData {
        constructor(dataOrW, wOrH, h) {
            if (typeof dataOrW === 'number') {
                this.width = dataOrW;
                this.height = wOrH;
                this.data = new Uint8ClampedArray(dataOrW * wOrH * 4);
            } else {
                this.data = dataOrW;
                this.width = wOrH;
                this.height = h;
            }
        }
    };
}

// pdfjs-dist sometimes probes for these — define harmless stubs so probing
// doesn't throw. They never get called because we only ever read text.
if (typeof globalThis.Worker === 'undefined') {
    globalThis.Worker = class Worker {
        constructor() { }
        postMessage() { }
        terminate() { }
        addEventListener() { }
        removeEventListener() { }
    };
}
