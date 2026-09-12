import { zoomInToPixel } from "./camera.js";
import { placePixel } from "./canvas.js";
import { CANVAS_COLOR_PALETTE, CANVAS_COLOR_PALETTE_HEX } from "../constants/app_constant.js";

const palette = document.getElementById('palette');
const preview = document.getElementById('pixel-preview');
const placeButton = document.getElementById('place-tile-btn');

let cooldownSecondsRemaining = 0;
let cooldownInterval = null;

function openPalette() {
    palette.style.transform = 'translate(-50%, 0)';
    zoomInToPixel();
}

export function closePalette() {
    preview.style.visibility = 'hidden';

    const button = palette.getElementsByTagName('button').item(1);
    if (!isCooldownActive()) {
        button.disabled = true;
        button.style.cursor = 'not-allowed';
    }

    const box = document.querySelector('[data-selected]');
    box?.removeAttribute('data-selected');
    box?.classList?.remove('animate-heartbeat');

    palette.style.transform = 'translate(-50%, 100%)';
}

export function fillPalette() {
    const button = palette.getElementsByTagName('button').item(1);
    const colorContainer = palette.children[0];
    colorContainer.innerHTML = '';

    const reversedPalette = Array.from(CANVAS_COLOR_PALETTE).reverse();
    for (const color of reversedPalette) {
        const originalIndex = CANVAS_COLOR_PALETTE.indexOf(color);
        const hexValue = CANVAS_COLOR_PALETTE_HEX[originalIndex];
        const div = document.createElement('div');

        div.classList.add('palette-cbox');
        div.style.backgroundColor = hexValue;
        div.setAttribute('data-cindex', originalIndex);
        div.onclick = () => {
            const box = document.querySelector('[data-selected]');
            box?.removeAttribute('data-selected');
            box?.classList?.remove('animate-heartbeat');

            div.setAttribute('data-selected', 'true');
            div.classList.add('animate-heartbeat');

            preview.style.visibility = 'visible';
            preview.style.backgroundColor = hexValue;

            if (!isCooldownActive()) {
                button.disabled = false;
                button.style.cursor = 'pointer';
            }
        };

        colorContainer.appendChild(div);
    }
}

let cooldownTargetTimestamp = 0;

export function triggerCooldownCountdown(seconds) {
    cooldownTargetTimestamp = Date.now() + (seconds * 1000);
    const applyButton = palette.getElementsByTagName('button').item(1);

    if (cooldownInterval) clearInterval(cooldownInterval);

    function update() {
        const remainingMs = cooldownTargetTimestamp - Date.now();
        cooldownSecondsRemaining = Math.max(0, Math.ceil(remainingMs / 1000));

        if (cooldownSecondsRemaining > 0) {
            applyButton.innerText = `Wait (${cooldownSecondsRemaining}s)`;
            placeButton.innerText = `Wait (${cooldownSecondsRemaining}s)`;
            applyButton.disabled = true;
            applyButton.style.cursor = 'not-allowed';
        } else {
            clearInterval(cooldownInterval);
            cooldownInterval = null;
            applyButton.innerText = 'Apply';
            placeButton.innerText = 'Place a tile';
            const hasSelected = !!document.querySelector('[data-selected]');
            applyButton.disabled = !hasSelected;
            applyButton.style.cursor = hasSelected ? 'pointer' : 'not-allowed';
        }
    }

    update();
    cooldownInterval = setInterval(update, 1000);
}

export function isCooldownActive() {
    return cooldownTargetTimestamp > Date.now();
}

window.addEventListener('load', () => {
    placeButton.onclick = openPalette;
    palette.getElementsByTagName('button').item(0).onclick = closePalette;
    palette.getElementsByTagName('button').item(1).onclick = placePixel;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && cooldownTargetTimestamp > 0) {
            const remainingMs = cooldownTargetTimestamp - Date.now();
            cooldownSecondsRemaining = Math.max(0, Math.ceil(remainingMs / 1000));
            const applyButton = palette.getElementsByTagName('button').item(1);
            if (cooldownSecondsRemaining <= 0) {
                if (cooldownInterval) {
                    clearInterval(cooldownInterval);
                    cooldownInterval = null;
                }
                applyButton.innerText = 'Apply';
                placeButton.innerText = 'Place a tile';
                const hasSelected = !!document.querySelector('[data-selected]');
                applyButton.disabled = !hasSelected;
                applyButton.style.cursor = hasSelected ? 'pointer' : 'not-allowed';
            } else {
                applyButton.innerText = `Wait (${cooldownSecondsRemaining}s)`;
                placeButton.innerText = `Wait (${cooldownSecondsRemaining}s)`;
            }
        }
    });
});