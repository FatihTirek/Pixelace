const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const DOMAIN = isLocal ? 'https://localhost:7296/' : 'https://pixelace-backend.onrender.com/';

const CHAT_API = DOMAIN + 'api/chat';
const CANVAS_API = DOMAIN + 'api/canvas';

export const CHAT_HUB = DOMAIN + 'hub/chat';
export const CANVAS_HUB = DOMAIN + 'hub/canvas';

export const CHAT_API_GET_MESSAGES = CHAT_API + '/messages';
export const CANVAS_API_GET_CANVAS = CANVAS_API;