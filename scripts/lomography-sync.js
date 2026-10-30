// Refreshes photos/lomography.json from the Lomography profile.
//
// lomography.com sits behind a Cloudflare challenge and sends no CORS headers,
// so neither the site nor CI can read it. Run this in a real browser instead:
// open https://www.lomography.com/homes/artbonvic/photos, paste this file into
// the DevTools console, and save the downloaded lomography.json over
// photos/lomography.json. Image URLs point at cdn.assets.lomography.com,
// which allows hotlinking, so only the metadata lives in this repository.
(async () => {
    const user = 'artbonvic';
    const delay = 700;

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const parse = html => new DOMParser().parseFromString(html, 'text/html');
    // Lomography answers 429 when pushed, so go one request at a time and back off.
    const get = async path => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
            await sleep(delay);
            const response = await fetch(path, { credentials: 'include' });

            if (response.status === 429) {
                await sleep(5000 * (attempt + 1));
                continue;
            }

            if (!response.ok) {
                throw new Error(`${response.status} ${path}`);
            }

            return parse(await response.text());
        }

        throw new Error(`429 ${path}`);
    };

    // 1. Walk the "recent" listing to collect photo ids and grid thumbnails, newest first.
    const listed = [];

    for (let page = 1; page < 100; page += 1) {
        const doc = await get(`/homes/${user}/photos?order=recent&page=${page}`);
        const links = [...doc.querySelectorAll(`a[href*="/homes/${user}/photos/"]`)]
            .filter(a => a.querySelector('img[src*="cdn.assets.lomography.com"]'));

        links.forEach(a => {
            const id = (a.getAttribute('href').match(/photos\/(\d+)/) || [])[1];

            if (id && !listed.some(item => item.id === id)) {
                listed.push({ id, thumb: a.querySelector('img').getAttribute('src') });
            }
        });

        console.log(`[lomo] page ${page}: ${listed.length} photos so far`);

        if (!doc.querySelector('a[rel="next"], a[href*="page=' + (page + 1) + '"]')) {
            break;
        }
    }

    // 2. Albums: each one shows up as a cover link plus a title link with the same href.
    const albums = [];

    for (let page = 1; page < 100; page += 1) {
        const doc = await get(`/homes/${user}/albums?page=${page}`);
        const before = albums.length;

        doc.querySelectorAll(`a[href*="/homes/${user}/albums/"]`).forEach(a => {
            const path = a.getAttribute('href').split('?')[0];
            const slug = path.split('/').pop();

            if (!/^\d+-/.test(slug)) {
                return;
            }

            let album = albums.find(item => item.slug === slug);

            if (!album) {
                album = { slug, url: new URL(path, location.origin).href, title: '', cover: null };
                albums.push(album);
            }

            const img = a.querySelector('img');

            if (img && !album.cover) {
                album.cover = img.getAttribute('src');
            } else if (!img && a.textContent.trim() && !album.title) {
                album.title = a.textContent.replace(/\s+/g, ' ').trim();
            }
        });

        console.log(`[lomo] albums page ${page}: ${albums.length} albums`);

        if (albums.length === before || !doc.querySelector('a[href*="page=' + (page + 1) + '"]')) {
            break;
        }
    }

    // 3. Open every photo page for the large image and its camera / film / album.
    const field = (doc, label) => {
        const dt = [...doc.querySelectorAll('dl dt')].find(el => el.textContent.trim().startsWith(label));
        const dd = dt && dt.nextElementSibling;

        if (!dd) {
            return null;
        }

        return { name: dd.textContent.replace(/\s+/g, ' ').trim(), links: [...dd.querySelectorAll('a')] };
    };

    const photos = [];

    for (const item of listed) {
        try {
            const doc = await get(`/homes/${user}/photos/${item.id}`);
            const img = doc.querySelector('.asset img[srcset]') || doc.querySelector('.asset img');
            const srcset = img ? img.getAttribute('srcset') || '' : '';
            const sources = Object.fromEntries(srcset.split(',').map(part => {
                const [url, density] = part.trim().split(/\s+/);
                return [density, url];
            }));
            const large = sources['1x'] || (img && img.getAttribute('src')) || item.thumb;
            const size = (large.match(/\/(\d+)x(\d+)x\d+\.\w+/) || []).slice(1).map(Number);
            const original = (doc.body.textContent.match(/Download \((\d+)\s*[×x]\s*(\d+)\)/) || []).slice(1).map(Number);
            const date = field(doc, 'Uploaded');
            const albumLinks = (field(doc, 'Albums') || { links: [] }).links;

            photos.push({
                id: item.id,
                url: `https://www.lomography.com/homes/${user}/photos/${item.id}`,
                thumb: item.thumb,
                image: large,
                image2x: sources['2x'] || null,
                width: original[0] || size[0] || null,
                height: original[1] || size[1] || null,
                uploaded: date ? date.name : null,
                camera: (field(doc, 'Camera') || {}).name || null,
                film: (field(doc, 'Film') || {}).name || null,
                albums: albumLinks.map(a => a.getAttribute('href').split('?')[0].split('/').pop())
            });
        } catch (error) {
            console.warn(`[lomo] skipped ${item.id}`, error);
        }

        console.log(`[lomo] ${photos.length}/${listed.length}`);
    }

    const payload = {
        user,
        profile: `https://www.lomography.com/homes/${user}`,
        syncedAt: new Date().toISOString(),
        albums,
        photos
    };

    window.__lomographySync = payload;

    const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lomography.json';
    link.click();

    console.log(`[lomo] done: ${payload.photos.length} photos`);
})();
