export const PIXEL_SIZE = 1;
export const CANVAS_SIZE = 1000;
export const ZOOM_MAX = 50;
export const ZOOM_FACTOR = 1.732;
export const ZOOM_RENDER_MODE_THRESHOLD = 1;
export const MIN_ZOOM_FOR_SCALE_ANIMATION = 21;
export const SCALE_ANIMATION_ZOOM_FACTOR = 1.275;
export const CANVAS_TRANSFORM_ANIMATION_DURATION = 350;
export const DEFAULT_ROOM = 'EN';
export const ROOM_DETAILS = [
    ['EN', 'English'],
    ['TR', 'Turkish'],
    ['ES', 'Spanish'],
    ['DE', 'German'],
    ['FR', 'French'],
    ['PT', 'Portuguese'],
    ['IT', 'Italian'],
    ['RU', 'Russian'],
    ['JA', 'Japanese'],
    ['KO', 'Korean'],
    ['ZH', 'Chinese'],
    ['AR', 'Arabic']
];
export const CHAT_COLOR_PALETTE = ['#ff1744', '#f50057', '#d500f9', '#651fff', '#3d5afe', '#2979ff', '#008573', '#008c3a', '#ff6d00', '#dd2c00'];

// Official Reddit r/place 2022/2023 32-Color Palette (exact 1:1 matching IDs 0 to 31)
export const CANVAS_COLOR_PALETTE = [
    0xff1a006d, 0xff3900be, 0xff0045ff, 0xff00a8ff, 0xff35d6ff, 0xffb8f8ff,
    0xff68a300, 0xff78cc00, 0xff56ed7e, 0xff6f7500, 0xffaa9e00, 0xffc0cc00,
    0xffa45024, 0xffea9036, 0xfff4e951, 0xffc13a49, 0xffff5c6a, 0xffffb394,
    0xff9f1e81, 0xffc04ab4, 0xffffabe4, 0xff7f10de, 0xff8138ff, 0xffaa99ff,
    0xff2f486d, 0xff26699c, 0xff70b4ff, 0xff000000, 0xff525251, 0xff908d89,
    0xffd9d7d4, 0xffffffff
];

export const abgrToHex = value => 
    `#${(value & 0xFF).toString(16).padStart(2, '0')}${((value >> 8) & 0xFF).toString(16).padStart(2, '0')}${((value >> 16) & 0xFF).toString(16).padStart(2, '0')}`;

export const CANVAS_COLOR_PALETTE_HEX = CANVAS_COLOR_PALETTE.map(abgrToHex);

export function getOrCreateGuestId() {
    let guestId = localStorage.getItem('pixelace_guest_id');
    if (!guestId) {
        guestId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : 'guest_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('pixelace_guest_id', guestId);
    }
    return guestId;
}