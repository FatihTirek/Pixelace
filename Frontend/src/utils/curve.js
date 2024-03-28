export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
}