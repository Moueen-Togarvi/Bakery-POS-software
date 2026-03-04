import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const data = await request.formData();
        const file = data.get('file') as File;

        if (!file || typeof file === 'string' || !file.name) {
            return json({ message: 'No file provided' }, { status: 400 });
        }

        if (!file.type || !file.type.startsWith('image/')) {
            return json({ message: 'Only image files are allowed' }, { status: 400 });
        }

        // Convert the file array buffer to a base64 string
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');

        // Prepare the upload form data for ImgBB
        const imgbbFormData = new URLSearchParams();
        imgbbFormData.append('key', 'ca5ce3fa852c2a12096c8b42fcdd0076');
        imgbbFormData.append('image', base64Image);
        imgbbFormData.append('name', file.name.split('.')[0] || 'upload');

        // Post to ImgBB
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: imgbbFormData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'ImgBB upload failed');
        }

        // result.data.url contains the direct image link
        return json({ url: result.data.url });
    } catch (error) {
        console.error('File upload error:', error);
        return json({ message: 'Error uploading file' }, { status: 500 });
    }
};
