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

export function triggerCooldownCountdown(seconds) {
    cooldownSecondsRemaining = seconds;
    const applyButton = palette.getElementsByTagName('button').item(1);

    if (cooldownInterval) clearInterval(cooldownInterval);

    function update() {
        if (cooldownSecondsRemaining > 0) {
            applyButton.innerText = `Wait (${cooldownSecondsRemaining}s)`;
            placeButton.innerText = `Wait (${cooldownSecondsRemaining}s)`;
            applyButton.disabled = true;
            applyButton.style.cursor = 'not-allowed';
            cooldownSecondsRemaining--;
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
    return cooldownSecondsRemaining > 0;
}

window.addEventListener('load', () => {
    placeButton.onclick = openPalette;
    palette.getElementsByTagName('button').item(0).onclick = closePalette;
    palette.getElementsByTagName('button').item(1).onclick = placePixel;
});