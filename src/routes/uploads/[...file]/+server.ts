import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const filename = params.file;
    if (!filename) throw error(404, 'Not found');

    const filepath = join(process.cwd(), 'uploads', filename);

    if (!existsSync(filepath)) {
        throw error(404, 'File not found');
    }

    try {
        const file = readFileSync(filepath);
        const ext = filename.split('.').pop()?.toLowerCase();

        let contentType = 'image/jpeg';
        if (ext === 'png') contentType = 'image/png';
        else if (ext === 'gif') contentType = 'image/gif';
        else if (ext === 'webp') contentType = 'image/webp';
        else if (ext === 'svg') contentType = 'image/svg+xml';
        else if (ext === 'avif') contentType = 'image/avif';
        else if (ext === 'bmp') contentType = 'image/bmp';

        return new Response(file, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000'
            }
        });
    } catch (err) {
        console.error('Error serving file:', err);
        throw error(500, 'Error reading file');
    }
};
