export function unquote(raw: string): string {
    // If it starts and ends with double-quotes "…"
    if (raw.startsWith('"') && raw.endsWith('"')) {
        raw = raw.slice(1, -1);
    }

    // If it then starts and ends with single-quotes '…'
    if (raw.startsWith("'") && raw.endsWith("'")) {
        raw = raw.slice(1, -1);
    }

    return raw;
}