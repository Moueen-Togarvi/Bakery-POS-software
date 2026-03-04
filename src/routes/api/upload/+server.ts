import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const data = await request.formData();
        const file = data.get('file') as File;

        if (!file || typeof file === 'string' || !file.name) {
            return json({ message: 'No file provided' }, { status: 400 });
        }

        // Basic validation
        if (!file.type || !file.type.startsWith('image/')) {
            return json({ message: 'Only image files are allowed' }, { status: 400 });
        }

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}-${safeName}`;

        // Save to root-level uploads folder to avoid Vite static caching bugs
        const uploadDir = join(process.cwd(), 'uploads');

        if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
        }

        const filepath = join(uploadDir, filename);

        const buffer = Buffer.from(await file.arrayBuffer());
        writeFileSync(filepath, buffer);

        return json({ url: `/uploads/${filename}` });
    } catch (error) {
        console.error('File upload error:', error);
        return json({ message: 'Error uploading file' }, { status: 500 });
    }
};
