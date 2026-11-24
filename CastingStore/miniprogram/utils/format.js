export function money(value) {
    const n = typeof value === 'number' && isFinite(value) ? value : 0;
    return (Math.round(n * 100) / 100).toFixed(2);
}
export function moneyShort(value) {
    const n = typeof value === 'number' ? value : 0;
    const abs = Math.abs(n);
    if (abs >= 10000)
        return (n / 10000).toFixed(1) + '万';
    return money(n);
}
export function qty(value) {
    const n = typeof value === 'number' ? value : 0;
    return String(Math.round(n * 100) / 100);
}
export function percent(value) {
    const n = typeof value === 'number' && isFinite(value) ? value : 0;
    return (n * 100).toFixed(1) + '%';
}
function pad(n) {
    return n < 10 ? '0' + n : String(n);
}
export function dateOnly(input) {
    if (!input)
        return '';
    const d = new Date(input);
    if (isNaN(d.getTime()))
        return '';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function dateTime(input) {
    if (!input)
        return '';
    const d = new Date(input);
    if (isNaN(d.getTime()))
        return '';
    return `${dateOnly(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function todayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}
export function monthStart() {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}
