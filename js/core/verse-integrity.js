(function(root) {
    const algorithm = 'sha256-chunks-v1';
    const chunkSize = 256;

    async function fingerprint(records, cryptoProvider) {
        if (!cryptoProvider || !cryptoProvider.subtle || typeof TextEncoder !== 'function') {
            throw new Error('verse-integrity-unavailable');
        }
        const encoder = new TextEncoder();
        const hashes = [];
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize).map(record => [
                record && record.book, record && record.chapter, record && record.verse,
                record && record.version, record && record.rarity
            ]);
            const digest = await cryptoProvider.subtle.digest('SHA-256', encoder.encode(JSON.stringify(chunk)));
            hashes.push(Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''));
        }
        const digest = await cryptoProvider.subtle.digest('SHA-256', encoder.encode(hashes.join('')));
        return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async function verify(records, scope, manifest, cryptoProvider, newBooks) {
        if (!manifest || manifest.version !== 1 || manifest.algorithm !== algorithm || manifest.chunkSize !== chunkSize ||
            !manifest.shards || !manifest.shards.old || !manifest.shards.new) {
            throw new Error('verse-integrity-unavailable');
        }
        if (!Array.isArray(records) || !['old', 'new', 'full'].includes(scope)) return false;
        const parts = scope === 'full'
            ? {
                old: records.filter(record => !record || !newBooks.has(record.book)),
                new: records.filter(record => record && newBooks.has(record.book))
            }
            : { [scope]: records };
        for (const [name, part] of Object.entries(parts)) {
            const expected = manifest.shards[name];
            if (part.length !== expected.count) return false;
            if (await fingerprint(part, cryptoProvider) !== expected.sha256) return false;
        }
        return true;
    }

    const api = { algorithm, chunkSize, fingerprint, verify };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.VerseIntegrity = api;
})(typeof window !== 'undefined' ? window : globalThis);
