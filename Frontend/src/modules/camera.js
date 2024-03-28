import * as curve from "../utils/curve.js";
import * as app from "../constants/app_constant.js";
import { applyBoardScale, applyBoardTranslate, applyBoardRenderingMode } from "./board.js";

let panning = false;
let pinching = false;
let mousemoved = false;
let startPanOrPinch = {};
let minZoom = Math.min(innerWidth, innerHeight) / (app.BOARD_SIZE * 2);

const board = { offset: { x: 0, y: 0 }, zoom: minZoom };
const boardEl = document.getElementById('board-wrapper');

function getPinchObject(e) {
    const x = e.touches[0].clientX + e.touches[1].clientX;
    const y = e.touches[0].clientY + e.touches[1].clientY;
    const distance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

    return { x: x, y: y, distance: distance };
}

function getPanObject(e) {
    const x = e instanceof TouchEvent ? e.touches[0].clientX : e.clientX;
    const y = e instanceof TouchEvent ? e.touches[0].clientY : e.clientY;

    return { x: x, y: y };
}

function onMouseUp() {
    panning = false;
    pinching = false;
}

function onMouseDown(e) {
    panning = true;
    mousemoved = false;
    pinching = e instanceof TouchEvent && e.touches.length === 2;
    startPanOrPinch = pinching ? getPinchObject(e) : getPanObject(e);
}

function onMouseMove(e) {
    mousemoved = true;

    if (panning) {
        const newPanOrPinch = pinching ? getPinchObject(e) : getPanObject(e);
        const x = (newPanOrPinch.x - startPanOrPinch.x) / board.zoom;
        const y = (newPanOrPinch.y - startPanOrPinch.y) / board.zoom;

        if (pinching) {
            const value = newPanOrPinch.distance / startPanOrPinch.distance * board.zoom;
            const newZoom = Math.max(Math.min(value, app.ZOOM_MAX), minZoom)

            board.zoom = newZoom;

            applyBoardScale(board);
            applyBoardRenderingMode(board);
        }

        startPanOrPinch = newPanOrPinch;

        setBoardOffset(x, y);
        applyBoardTranslate(board);
    }
}

function onWheel(e) {
    e.preventDefault();

    const value = Math.sign(-e.deltaY) > 0 ? board.zoom * app.ZOOM_FACTOR : board.zoom / app.ZOOM_FACTOR;
    const newZoom = Math.max(Math.min(value, app.ZOOM_MAX), minZoom)

    const offset = getMouseOffsetRelativeBoardOrigin(e);
    const x = (offset.x / newZoom) - (offset.x / board.zoom);
    const y = (offset.y / newZoom) - (offset.y / board.zoom);

    board.zoom = newZoom;

    setBoardOffset(x, y);
    applyBoardScale(board);
    applyBoardTranslate(board);
    applyBoardRenderingMode(board);
}

function goToPixel(e) {
    if (!mousemoved) {
        const offset = getMouseOffsetRelativeBoardOrigin(e);
        const x = -(offset.x - board.offset.x * board.zoom) / board.zoom;
        const y = -(offset.y - board.offset.y * board.zoom) / board.zoom;

        const start = { x: board.offset.x, y: board.offset.y }
        const end = { x: x, y: y }

        function apply(value) {
            board.offset = value;
            applyBoardTranslate(board);
        }

        animate(app.BOARD_TRANSFORM_ANIMATION_DURATION, curve.easeOutCubic, start, end, apply);
    }
}

export function zoomInToPixel() {
    if (board.zoom < app.MIN_ZOOM_FOR_SCALE_ANIMATION) {
        let result = 0;
        let i = 0;

        while (result < app.MIN_ZOOM_FOR_SCALE_ANIMATION) {
            result = board.zoom * app.SCALE_ANIMATION_ZOOM_FACTOR ** i;
            i += 1;
        }

        const start = board.zoom;
        const end = result;

        function apply(value) {
            board.zoom = value;
            applyBoardScale(board);
            applyBoardRenderingMode(board);
        }

        animate(app.BOARD_TRANSFORM_ANIMATION_DURATION, curve.easeOutQuart, start, end, apply);
    }
}

export function getPixelOffset() {
    const x = Math.floor(Math.abs(board.offset.x / app.PIXEL_SIZE));
    const y = Math.floor(Math.abs(board.offset.y / app.PIXEL_SIZE));

    return { x: x, y: y };
}

function setBoardOffset(x, y) {
    board.offset.x = Math.max(Math.min(x + board.offset.x, 0), -app.BOARD_SIZE + 0.1);
    board.offset.y = Math.max(Math.min(y + board.offset.y, 0), -app.BOARD_SIZE + 0.1);
}

function getMouseOffsetRelativeBoardOrigin(e) {
    const x = (e instanceof TouchEvent ? e.touches[0].clientX : e.clientX) - boardEl.offsetLeft;
    const y = (e instanceof TouchEvent ? e.touches[0].clientY : e.clientY) - boardEl.offsetTop;

    return { x: x, y: y };
}

function animate(duration, curve, start, end, applyToElement) {
    function run(currentTime, startTime) {
        const elapsedTime = currentTime - startTime;

        if (elapsedTime < duration) {
            const progress = curve(elapsedTime / duration);

            let value;

            if (start instanceof Object) {
                const x = (start.x + (end.x - start.x) * progress);
                const y = (start.y + (end.y - start.y) * progress);

                value = { x: x, y: y };
            } else value = start + (end - start) * progress;

            applyToElement(value);
            requestAnimationFrame((t) => run(t, startTime));
        }
    }

    requestAnimationFrame((t) => run(t, t));
}

window.addEventListener('load', () => {
    const scene = document.getElementById('scene');

    scene.onwheel = onWheel;
    scene.onmousedown = onMouseDown;
    scene.onmousemove = onMouseMove;
    scene.ontouchstart = onMouseDown;
    scene.ontouchmove = onMouseMove;
    scene.ontouchend = onMouseUp;

    document.getElementsByTagName('body')[0].onmouseup = onMouseUp;
    document.getElementById('board-wrapper').onclick = goToPixel;
});