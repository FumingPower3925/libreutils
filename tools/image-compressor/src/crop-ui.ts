/**
 * Visual Crop Tool — interactive crop overlay with drag handles.
 */

export interface CropRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

type Handle = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l' | 'move' | null;

const HANDLE_SIZE = 8;
const MIN_CROP = 10; // minimum crop dimension in image pixels

export class CropTool {
    readonly el: HTMLElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D | null = null;
    private img: HTMLImageElement | null = null;
    private scale = 1;
    private displayW = 0;
    private displayH = 0;
    private infoEl: HTMLElement;

    // Crop in image coordinates
    private cx = 0;
    private cy = 0;
    private cw = 0;
    private ch = 0;

    // Interaction state
    private handle: Handle = null;
    private startMX = 0;
    private startMY = 0;
    private startCX = 0;
    private startCY = 0;
    private startCW = 0;
    private startCH = 0;

    // Bound handlers (for cleanup)
    private onMouseDown: (e: MouseEvent) => void;
    private onMouseMove: (e: MouseEvent) => void;
    private onMouseUp: () => void;
    private onTouchStart: (e: TouchEvent) => void;
    private onTouchMove: (e: TouchEvent) => void;
    private onTouchEnd: () => void;

    constructor() {
        this.el = document.createElement('div');
        this.el.className = 'crop-tool';
        this.el.innerHTML = `
            <style>
                .crop-tool { position: relative; margin-bottom: 0.75rem; }
                .crop-tool canvas {
                    display: block;
                    max-width: 100%;
                    border-radius: 0.375rem;
                    border: 1px solid var(--lu-border, #e5e7eb);
                    cursor: crosshair;
                    touch-action: none;
                }
                .crop-info-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 0.5rem;
                    font-size: 0.8rem;
                    color: var(--lu-text-secondary, #6b7280);
                }
                .crop-reset {
                    background: none;
                    border: 1px solid var(--lu-border, #e5e7eb);
                    border-radius: 0.375rem;
                    padding: 0.25rem 0.625rem;
                    font-size: 0.75rem;
                    cursor: pointer;
                    color: var(--lu-text-secondary, #6b7280);
                }
                .crop-reset:hover {
                    border-color: var(--lu-primary-300, #c4b5fd);
                    color: var(--lu-primary-600, #613E9C);
                }
            </style>
        `;

        this.canvas = document.createElement('canvas');
        this.el.appendChild(this.canvas);

        const bar = document.createElement('div');
        bar.className = 'crop-info-bar';
        this.infoEl = document.createElement('span');
        const resetBtn = document.createElement('button');
        resetBtn.className = 'crop-reset';
        resetBtn.textContent = 'Reset Crop';
        resetBtn.addEventListener('click', () => this.resetCrop());
        bar.appendChild(this.infoEl);
        bar.appendChild(resetBtn);
        this.el.appendChild(bar);

        // Bind handlers
        this.onMouseDown = (e) => this.pointerDown(e.offsetX, e.offsetY, e);
        this.onMouseMove = (e) => this.pointerMove(e.offsetX, e.offsetY);
        this.onMouseUp = () => this.pointerUp();
        this.onTouchStart = (e) => {
            const r = this.canvas.getBoundingClientRect();
            const t = e.touches[0];
            this.pointerDown(t.clientX - r.left, t.clientY - r.top, e);
        };
        this.onTouchMove = (e) => {
            const r = this.canvas.getBoundingClientRect();
            const t = e.touches[0];
            this.pointerMove(t.clientX - r.left, t.clientY - r.top);
        };
        this.onTouchEnd = () => this.pointerUp();

        this.canvas.addEventListener('mousedown', this.onMouseDown);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
        this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
        document.addEventListener('touchend', this.onTouchEnd);
    }

    setImage(img: HTMLImageElement): void {
        this.img = img;
        this.cx = 0;
        this.cy = 0;
        this.cw = img.naturalWidth;
        this.ch = img.naturalHeight;
        this.resize();
        this.draw();
    }

    getCropRegion(): CropRegion {
        return {
            x: Math.round(this.cx),
            y: Math.round(this.cy),
            width: Math.round(this.cw),
            height: Math.round(this.ch),
        };
    }

    isFullImage(): boolean {
        if (!this.img) return true;
        return (
            Math.round(this.cx) === 0 &&
            Math.round(this.cy) === 0 &&
            Math.round(this.cw) === this.img.naturalWidth &&
            Math.round(this.ch) === this.img.naturalHeight
        );
    }

    destroy(): void {
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('touchstart', this.onTouchStart);
        this.canvas.removeEventListener('touchmove', this.onTouchMove);
        document.removeEventListener('touchend', this.onTouchEnd);
        this.img = null;
    }

    // ─── Internal ────────────────────────────────────────────────

    private resetCrop(): void {
        if (!this.img) return;
        this.cx = 0;
        this.cy = 0;
        this.cw = this.img.naturalWidth;
        this.ch = this.img.naturalHeight;
        this.draw();
    }

    private resize(): void {
        if (!this.img) return;
        const containerW = this.el.clientWidth || this.canvas.parentElement?.clientWidth || 400;
        const maxH = 400;
        const imgW = this.img.naturalWidth;
        const imgH = this.img.naturalHeight;
        this.scale = Math.min(containerW / imgW, maxH / imgH, 1);
        this.displayW = Math.round(imgW * this.scale);
        this.displayH = Math.round(imgH * this.scale);
        this.canvas.width = this.displayW;
        this.canvas.height = this.displayH;
        this.ctx = this.canvas.getContext('2d');
    }

    private draw(): void {
        if (!this.img || !this.ctx) return;
        const ctx = this.ctx;
        const { displayW, displayH, scale } = this;

        ctx.clearRect(0, 0, displayW, displayH);

        // Full image, dimmed
        ctx.globalAlpha = 0.3;
        ctx.drawImage(this.img, 0, 0, displayW, displayH);
        ctx.globalAlpha = 1.0;

        // Bright crop area
        const dx = this.cx * scale;
        const dy = this.cy * scale;
        const dw = this.cw * scale;
        const dh = this.ch * scale;

        ctx.save();
        ctx.beginPath();
        ctx.rect(dx, dy, dw, dh);
        ctx.clip();
        ctx.drawImage(this.img, 0, 0, displayW, displayH);
        ctx.restore();

        // Rule-of-thirds grid
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.5;
        for (let i = 1; i < 3; i++) {
            const gx = dx + (dw * i) / 3;
            const gy = dy + (dh * i) / 3;
            ctx.beginPath(); ctx.moveTo(gx, dy); ctx.lineTo(gx, dy + dh); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(dx, gy); ctx.lineTo(dx + dw, gy); ctx.stroke();
        }

        // Border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(dx, dy, dw, dh);

        // Handles
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#613E9C';
        ctx.lineWidth = 1.5;
        const hs = HANDLE_SIZE;
        const pts = this.handlePoints(dx, dy, dw, dh);
        for (const [hx, hy] of pts) {
            ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
            ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
        }

        // Info
        this.infoEl.textContent = `Crop: ${Math.round(this.cw)} × ${Math.round(this.ch)} px`;
    }

    private handlePoints(dx: number, dy: number, dw: number, dh: number): [number, number][] {
        return [
            [dx, dy], [dx + dw / 2, dy], [dx + dw, dy],         // tl, t, tr
            [dx + dw, dy + dh / 2],                               // r
            [dx + dw, dy + dh], [dx + dw / 2, dy + dh], [dx, dy + dh], // br, b, bl
            [dx, dy + dh / 2],                                     // l
        ];
    }

    private hitTest(mx: number, my: number): Handle {
        const s = this.scale;
        const dx = this.cx * s, dy = this.cy * s;
        const dw = this.cw * s, dh = this.ch * s;
        const pts = this.handlePoints(dx, dy, dw, dh);
        const labels: Handle[] = ['tl', 't', 'tr', 'r', 'br', 'b', 'bl', 'l'];
        const threshold = HANDLE_SIZE + 4;

        for (let i = 0; i < pts.length; i++) {
            if (Math.abs(mx - pts[i][0]) < threshold && Math.abs(my - pts[i][1]) < threshold) {
                return labels[i];
            }
        }

        if (mx > dx && mx < dx + dw && my > dy && my < dy + dh) {
            return 'move';
        }

        return null;
    }

    private pointerDown(mx: number, my: number, e: MouseEvent | TouchEvent): void {
        this.handle = this.hitTest(mx, my);
        if (!this.handle) return;
        e.preventDefault();
        this.startMX = mx;
        this.startMY = my;
        this.startCX = this.cx;
        this.startCY = this.cy;
        this.startCW = this.cw;
        this.startCH = this.ch;
        this.updateCursor(this.handle);
    }

    private pointerMove(mx: number, my: number): void {
        if (!this.handle || !this.img) {
            // Update cursor on hover
            const h = this.hitTest(mx, my);
            this.updateCursor(h);
            return;
        }

        const s = this.scale;
        const dmx = (mx - this.startMX) / s;
        const dmy = (my - this.startMY) / s;
        const imgW = this.img.naturalWidth;
        const imgH = this.img.naturalHeight;

        let nx = this.startCX;
        let ny = this.startCY;
        let nw = this.startCW;
        let nh = this.startCH;

        switch (this.handle) {
            case 'move':
                nx = this.startCX + dmx;
                ny = this.startCY + dmy;
                break;
            case 'tl':
                nx = this.startCX + dmx; ny = this.startCY + dmy;
                nw = this.startCW - dmx; nh = this.startCH - dmy;
                break;
            case 't':
                ny = this.startCY + dmy; nh = this.startCH - dmy;
                break;
            case 'tr':
                ny = this.startCY + dmy;
                nw = this.startCW + dmx; nh = this.startCH - dmy;
                break;
            case 'r':
                nw = this.startCW + dmx;
                break;
            case 'br':
                nw = this.startCW + dmx; nh = this.startCH + dmy;
                break;
            case 'b':
                nh = this.startCH + dmy;
                break;
            case 'bl':
                nx = this.startCX + dmx;
                nw = this.startCW - dmx; nh = this.startCH + dmy;
                break;
            case 'l':
                nx = this.startCX + dmx; nw = this.startCW - dmx;
                break;
        }

        // Enforce minimums
        if (nw < MIN_CROP) { nw = MIN_CROP; if (this.handle !== 'move') nx = this.startCX + this.startCW - MIN_CROP; }
        if (nh < MIN_CROP) { nh = MIN_CROP; if (this.handle !== 'move') ny = this.startCY + this.startCH - MIN_CROP; }

        // Clamp to image bounds
        if (nx < 0) { if (this.handle === 'move') nw = this.startCW; nx = 0; }
        if (ny < 0) { if (this.handle === 'move') nh = this.startCH; ny = 0; }
        if (nx + nw > imgW) { if (this.handle === 'move') nx = imgW - nw; else nw = imgW - nx; }
        if (ny + nh > imgH) { if (this.handle === 'move') ny = imgH - nh; else nh = imgH - ny; }

        this.cx = Math.max(0, nx);
        this.cy = Math.max(0, ny);
        this.cw = Math.max(MIN_CROP, nw);
        this.ch = Math.max(MIN_CROP, nh);

        this.draw();
    }

    private pointerUp(): void {
        this.handle = null;
    }

    private updateCursor(h: Handle): void {
        const cursors: Record<string, string> = {
            tl: 'nw-resize', tr: 'ne-resize', bl: 'sw-resize', br: 'se-resize',
            t: 'n-resize', b: 's-resize', l: 'w-resize', r: 'e-resize',
            move: 'move',
        };
        this.canvas.style.cursor = h ? cursors[h] : 'crosshair';
    }
}
