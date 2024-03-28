import * as http from "../utils/http.js";
import { closePalette } from "./palette.js";
import { getPixelOffset } from "./camera.js";
import { showOfflinePage } from "./error.js";
import { BOARD_HUB, BOARD_API_GET_BOARD } from "../constants/api_constant.js";
import { PIXEL_SIZE, BOARD_SIZE, BOARD_COLOR_PALETTE, ZOOM_RENDER_MODE_THRESHOLD } from "../constants/app_constant.js";

const posale = document.getElementById('posale');
const board = document.getElementById('board-wrapper');
const select = document.getElementById('pixel-select');
const preview = document.getElementById('pixel-preview');
const ctx = document.getElementById('canvas').getContext('2d');

const connection = new signalR.HubConnectionBuilder().withUrl(BOARD_HUB).build();
const uint32 = new Uint32Array(BOARD_SIZE ** 2);

export async function initializeBoard() {
    const request = await http.get(BOARD_API_GET_BOARD);
    const uint8 = new Uint8Array(await request.arrayBuffer());
    const board = { offset: { x: 0, y: 0 }, zoom: Math.min(innerWidth, innerHeight) / (BOARD_SIZE * 2) };

    for (let i = 0; i < BOARD_SIZE ** 2; i++) uint32[i] = BOARD_COLOR_PALETTE[uint8[i]];

    ctx.putImageData(new ImageData(new Uint8ClampedArray(uint32.buffer), BOARD_SIZE, BOARD_SIZE), 0, 0);

    applyBoardScale(board);
    applyBoardTranslate(board);
    applyBoardRenderingMode(board);

    await connection.start();
    connection.on('ReceivePixel', (pixel) => uint32[pixel.boardIndex] = BOARD_COLOR_PALETTE[pixel.colorIndex]);
    connection.onclose((_) => showOfflinePage());
    requestAnimationFrame(updateMultiplePixels)
}

function updateMultiplePixels() {
    ctx.putImageData(new ImageData(new Uint8ClampedArray(uint32.buffer), BOARD_SIZE, BOARD_SIZE), 0, 0);
    requestAnimationFrame(updateMultiplePixels);    
}

export async function updateSinglePixel() {
    const offset = getPixelOffset();
    const element = document.querySelector('[data-selected]');
    const payload = { boardIndex: offset.x + 1000 * offset.y, colorIndex: Number(element.dataset.cindex) }

    uint32[payload.boardIndex] = BOARD_COLOR_PALETTE[payload.colorIndex];
    await connection.invoke('SendPixel', payload);
    closePalette();
}

export function applyBoardScale(object) {
    board.style.transform = `scale(${object.zoom}) translate(${object.offset.x}px, ${object.offset.y}px)`;
    posale.children[1].innerHTML = `${(object.zoom < 1 ? object.zoom.toFixed(1) : Math.round(object.zoom)) / 10}x`;
}

export function applyBoardTranslate(object) {
    const offset = getPixelOffset();
    const x = offset.x * PIXEL_SIZE;
    const y = offset.y * PIXEL_SIZE;

    board.style.transform = `scale(${object.zoom}) translate(${object.offset.x}px, ${object.offset.y}px)`;
    select.style.transform = `translate(${x}px, ${y}px)`;
    preview.style.transform = `translate(${x}px, ${y}px)`;
    posale.children[0].innerHTML = `(${offset.x},${offset.y}) `;
}

export function applyBoardRenderingMode(object) {
    if (object.zoom > ZOOM_RENDER_MODE_THRESHOLD)
        board.style.imageRendering = 'pixelated';
    else
        board.style.imageRendering = 'initial';
}