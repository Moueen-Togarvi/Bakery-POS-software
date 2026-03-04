import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFileSync } from 'fs';
import { join } from 'path';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const data = await request.formData();
        const file = data.get('file') as File;

        if (!file || !(file instanceof File)) {
            return json({ message: 'No file provided' }, { status: 400 });
        }

        // Basic validation
        if (!file.type.startsWith('image/')) {
            return json({ message: 'Only image files are allowed' }, { status: 400 });
        }

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}-${safeName}`;

        // Save to static/uploads
        const uploadDir = join(process.cwd(), 'static', 'uploads');
        const filepath = join(uploadDir, filename);

        const buffer = Buffer.from(await file.arrayBuffer());
        writeFileSync(filepath, buffer);

        return json({ url: `/uploads/${filename}` });
    } catch (error) {
        console.error('File upload error:', error);
        return json({ message: 'Error uploading file' }, { status: 500 });
    }
};
