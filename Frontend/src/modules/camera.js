import * as curve from "../utils/curve.js";
import * as app from "../constants/app_constant.js";
import { applyCanvasScale, applyCanvasTranslate, applyCanvasRenderingMode } from "./canvas.js";

let panning = false;
let pinching = false;
let startPanOrPinch = {};
let minZoom = Math.min(innerWidth, innerHeight) / (app.CANVAS_SIZE * 2);

const camera = { offset: { x: 0, y: 0 }, zoom: minZoom };
const canvasWrapper = document.getElementById('canvas-wrapper');

let currentAnimationId = null;

function getPinchObject(e) {
    const x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const distance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

    return { x: x, y: y, distance: distance };
}

function getPanObject(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    return { x: x, y: y };
}

function onMouseUp(e) {
    if (e.touches && e.touches.length === 1) {
        pinching = false;
        panning = true;
        startPanOrPinch = getPanObject(e);
        return;
    }
    panning = false;
    pinching = false;
}

let mouseDownPosition = { x: 0, y: 0 };
let isDragAction = false;
const DRAG_THRESHOLD_PX = 6;

function onMouseDown(e) {
    panning = true;
    isDragAction = false;
    pinching = Boolean(e.touches && e.touches.length === 2);
    startPanOrPinch = pinching ? getPinchObject(e) : getPanObject(e);
    mouseDownPosition = { x: startPanOrPinch.x, y: startPanOrPinch.y };
}

function onMouseMove(e) {
    if (panning) {
        const newPanOrPinch = pinching ? getPinchObject(e) : getPanObject(e);

        if (!isDragAction) {
            const distance = Math.hypot(newPanOrPinch.x - mouseDownPosition.x, newPanOrPinch.y - mouseDownPosition.y);
            if (distance > DRAG_THRESHOLD_PX) {
                isDragAction = true;
            }
        }

        const x = (newPanOrPinch.x - startPanOrPinch.x) / camera.zoom;
        const y = (newPanOrPinch.y - startPanOrPinch.y) / camera.zoom;

        if (pinching) {
            const value = newPanOrPinch.distance / startPanOrPinch.distance * camera.zoom;
            const newZoom = Math.max(Math.min(value, app.ZOOM_MAX), minZoom);

            camera.zoom = newZoom;

            applyCanvasScale(camera);
            applyCanvasRenderingMode(camera);
        }

        startPanOrPinch = newPanOrPinch;

        setCanvasOffset(x, y);
        applyCanvasTranslate(camera);
    }
}

function onWheel(e) {
    e.preventDefault();

    // Smooth proportional zoom for both trackpad (pinch/scroll) and mouse wheel
    const zoomMultiplier = e.ctrlKey ? 0.01 : 0.0025;
    const factor = Math.exp(-e.deltaY * zoomMultiplier);
    const newZoom = Math.max(Math.min(camera.zoom * factor, app.ZOOM_MAX), minZoom);

    const offset = getMouseOffsetRelativeCanvasOrigin(e);
    const x = (offset.x / newZoom) - (offset.x / camera.zoom);
    const y = (offset.y / newZoom) - (offset.y / camera.zoom);

    camera.zoom = newZoom;

    setCanvasOffset(x, y);
    applyCanvasScale(camera);
    applyCanvasTranslate(camera);
    applyCanvasRenderingMode(camera);
}

function goToPixel(e) {
    if (!isDragAction) {
        const offset = getMouseOffsetRelativeCanvasOrigin(e);
        const x = -(offset.x - camera.offset.x * camera.zoom) / camera.zoom;
        const y = -(offset.y - camera.offset.y * camera.zoom) / camera.zoom;

        const start = { x: camera.offset.x, y: camera.offset.y };
        const end = { x: x, y: y };
        const apply = value => { camera.offset = value; applyCanvasTranslate(camera); };

        animate(app.CANVAS_TRANSFORM_ANIMATION_DURATION, curve.easeOutCubic, start, end, apply);
    }
}

export function zoomInToPixel() {
    if (camera.zoom < app.MIN_ZOOM_FOR_SCALE_ANIMATION) {
        let result = 0;
        let i = 0;

        while (result < app.MIN_ZOOM_FOR_SCALE_ANIMATION) {
            result = camera.zoom * app.SCALE_ANIMATION_ZOOM_FACTOR ** i;
            i += 1;
        }

        const start = camera.zoom;
        const end = result;
        const apply = value => { camera.zoom = value; applyCanvasScale(camera); applyCanvasRenderingMode(camera); };

        animate(app.CANVAS_TRANSFORM_ANIMATION_DURATION, curve.easeOutCubic, start, end, apply);
    }
}

export function getPixelOffset() {
    const x = Math.floor(Math.abs(camera.offset.x / app.PIXEL_SIZE));
    const y = Math.floor(Math.abs(camera.offset.y / app.PIXEL_SIZE));

    return { x: x, y: y };
}

function setCanvasOffset(x, y) {
    camera.offset.x = Math.max(Math.min(x + camera.offset.x, 0), -app.CANVAS_SIZE + 0.1);
    camera.offset.y = Math.max(Math.min(y + camera.offset.y, 0), -app.CANVAS_SIZE + 0.1);
}

function getMouseOffsetRelativeCanvasOrigin(e) {
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - canvasWrapper.offsetLeft;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - canvasWrapper.offsetTop;

    return { x: x, y: y };
}

function animate(duration, curve, start, end, applyToElement) {
    if (currentAnimationId) {
        cancelAnimationFrame(currentAnimationId);
        currentAnimationId = null;
    }

    function run(currentTime, startTime) {
        const elapsedTime = currentTime - startTime;

        if (elapsedTime < duration) {
            const progress = curve(elapsedTime / duration);

            let value;
            if (start instanceof Object) {
                const x = (start.x + (end.x - start.x) * progress);
                const y = (start.y + (end.y - start.y) * progress);
                value = { x: x, y: y };
            } else {
                value = start + (end - start) * progress;
            }

            applyToElement(value);
            currentAnimationId = requestAnimationFrame((t) => run(t, startTime));
        } else {
            applyToElement(end);
            currentAnimationId = null;
        }
    }

    currentAnimationId = requestAnimationFrame((t) => run(t, t));
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
    canvasWrapper.onclick = goToPixel;
});