import { zoomInToPixel } from "./camera.js";
import { updateSinglePixel } from "./board.js";
import { BOARD_COLOR_PALETTE } from "../constants/app_constant.js";

const palette = document.getElementById('palette');
const preview = document.getElementById('pixel-preview');

function openPalette() {
    palette.style.transform = 'translate(-50%, 0)';
    zoomInToPixel();
}

export function closePalette() {
    preview.style.visibility = 'hidden';

    const button = palette.getElementsByTagName('button').item(1);
    button.disabled = true;
    button.style.cursor = 'not-allowed';

    const box = document.querySelector('[data-selected]');
    box?.removeAttribute('data-selected');
    box?.classList?.remove('animate-heartbeat');

    palette.style.transform = 'translate(-50%, 100%)';
}

export function fillPalette() {
    const button = palette.getElementsByTagName('button').item(1);

    for (const color of Array.from(BOARD_COLOR_PALETTE).reverse()) {
        const div = document.createElement('div');
        const value = getHexStringFromInt32Color(color);

        div.classList.add('palette-cbox');
        div.style.backgroundColor = value;
        div.setAttribute('data-cindex', BOARD_COLOR_PALETTE.indexOf(color));
        div.onclick = () => {
            const box = document.querySelector('[data-selected]');
            box?.removeAttribute('data-selected');
            box?.classList?.remove('animate-heartbeat');

            div.setAttribute('data-selected', true);
            div.classList.add('animate-heartbeat');

            preview.style.visibility = 'visible';
            preview.style.backgroundColor = value;

            button.disabled = false;
            button.style.cursor = 'pointer';
        };

        palette.children[0].appendChild(div);
    }
}

function getHexStringFromInt32Color(value) {
    const string = value.toString(16).padStart(8, '0');
    const r = string.substring(6);
    const g = string.substring(4, 6);
    const b = string.substring(2, 4);

    return '#' + r + g + b;
}

window.addEventListener('load', () => {
    document.getElementById('place').onclick = openPalette;
    palette.getElementsByTagName('button').item(0).onclick = closePalette;
    palette.getElementsByTagName('button').item(1).onclick = updateSinglePixel;
})