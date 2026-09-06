import * as http from "../utils/http.js";
import { closePalette, triggerCooldownCountdown } from "./palette.js";
import { getPixelOffset } from "./camera.js";
import { showOfflinePage } from "./error.js";
import { CANVAS_HUB, CANVAS_API_GET_CANVAS } from "../constants/api_constant.js";
import { 
    PIXEL_SIZE, 
    CANVAS_SIZE, 
    CANVAS_COLOR_PALETTE, 
    CANVAS_COLOR_PALETTE_HEX, 
    ZOOM_RENDER_MODE_THRESHOLD, 
    getOrCreateGuestId 
} from "../constants/app_constant.js";

const canvasInfo = document.getElementById('canvas-info');
const canvasWrapper = document.getElementById('canvas-wrapper');
const pixelCursor = document.getElementById('pixel-cursor');
const preview = document.getElementById('pixel-preview');
const canvasEl = document.getElementById('canvas');
const ctx = canvasEl.getContext('2d');

const guestId = getOrCreateGuestId();
const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${CANVAS_HUB}?userId=${encodeURIComponent(guestId)}`)
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .build();

const uint32 = new Uint32Array(CANVAS_SIZE ** 2);

export async function initializeCanvas() {
    const request = await http.get(CANVAS_API_GET_CANVAS);
    const uint8 = new Uint8Array(await request.arrayBuffer());
    const camera = { offset: { x: 0, y: 0 }, zoom: Math.min(innerWidth, innerHeight) / (CANVAS_SIZE * 2) };

    for (let i = 0; i < CANVAS_SIZE ** 2; i++) {
        uint32[i] = CANVAS_COLOR_PALETTE[uint8[i] || 0];
    }

    ctx.imageSmoothingEnabled = false;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(uint32.buffer), CANVAS_SIZE, CANVAS_SIZE), 0, 0);

    applyCanvasScale(camera);
    applyCanvasTranslate(camera);
    applyCanvasRenderingMode(camera);

    await connection.start();

    connection.on('ReceivePixel', pixel => drawPixelOnCanvas(pixel.canvasIndex, pixel.colorIndex));
    connection.onclose(showOfflinePage);

    const remaining = await connection.invoke('GetRemainingCooldown');
    if (remaining > 0) triggerCooldownCountdown(remaining);
}

export function drawPixelOnCanvas(canvasIndex, colorIndex) {
    if (canvasIndex < 0 || canvasIndex >= CANVAS_SIZE ** 2) return;
    uint32[canvasIndex] = CANVAS_COLOR_PALETTE[colorIndex];
    const x = canvasIndex % CANVAS_SIZE;
    const y = Math.floor(canvasIndex / CANVAS_SIZE);

    ctx.fillStyle = CANVAS_COLOR_PALETTE_HEX[colorIndex] || '#ffffff';
    ctx.fillRect(x, y, 1, 1);
}

export async function placePixel() {
    const offset = getPixelOffset();
    const element = document.querySelector('[data-selected]');
    if (!element) return;

    const colorIndex = Number(element.dataset.cindex);
    const canvasIndex = offset.x + CANVAS_SIZE * offset.y;
    const payload = { canvasIndex, colorIndex };

    const result = await connection.invoke('SendPixel', payload);
    if (result && result.success) {
        drawPixelOnCanvas(canvasIndex, colorIndex);
        closePalette();
        triggerCooldownCountdown(result.remainingCooldownSeconds || 60);
    } else {
        const remaining = result?.remainingCooldownSeconds || 60;
        alert(result?.errorMessage || `Cooldown active! Please wait ${remaining} seconds.`);
        triggerCooldownCountdown(remaining);
    }
}

export function applyCanvasScale(object) {
    const size = CANVAS_SIZE * object.zoom;
    canvasWrapper.style.width = `${size}px`;
    canvasWrapper.style.height = `${size}px`;
    applyCanvasTranslate(object);
    if (canvasInfo) canvasInfo.children[1].textContent = `${parseFloat((object.zoom / 10).toFixed(2))}x`;
}

export function applyCanvasTranslate(object) {
    const offset = getPixelOffset();
    const x = offset.x * object.zoom;
    const y = offset.y * object.zoom;
    const tx = object.offset.x * object.zoom;
    const ty = object.offset.y * object.zoom;

    canvasWrapper.style.transform = `translate(${tx}px, ${ty}px)`;
    pixelCursor.style.width = `${object.zoom}px`;
    pixelCursor.style.height = `${object.zoom}px`;
    preview.style.width = `${object.zoom}px`;
    preview.style.height = `${object.zoom}px`;
    pixelCursor.style.transform = `translate(${x}px, ${y}px)`;
    preview.style.transform = `translate(${x}px, ${y}px)`;
    if (canvasInfo) canvasInfo.children[0].textContent = `(${offset.x},${offset.y}) `;
}

export function applyCanvasRenderingMode(object) {
    canvasWrapper.style.imageRendering = 'pixelated';
    if (canvasEl) {
        canvasEl.classList.add('pixelated');
        canvasEl.style.imageRendering = 'pixelated';
    }
}
