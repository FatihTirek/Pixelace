import { initializeCanvas } from "./modules/canvas.js";
import { fillPalette } from "./modules/palette.js";
import { showOfflinePage } from "./modules/error.js";
import { drawDropdownFlag, fillDropdownMenu } from "./modules/chat.js";

window.addEventListener('load', async () => {
    try {
        await initializeCanvas();
        fillPalette();
        fillDropdownMenu();
        drawDropdownFlag();

        document.getElementById('content-loading').style.display = 'none';
        document.getElementById('content-main').style.display = 'block';
    } catch (_) {
        showOfflinePage();
    }
});