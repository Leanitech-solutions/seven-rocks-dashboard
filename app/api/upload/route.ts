import { NextResponse } from 'next/server';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer directly to Cloudinary (zero local disk storage).
 */
async function uploadToCloudinary(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string = 'seven-rocks/tenant-docs'
): Promise<{ secureUrl: string; publicId: string }> {
  const ext = path.extname(originalName) || (mimeType.includes('pdf') ? '.pdf' : '.png');
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const publicId = `${folder}/${Date.now()}-${base}${ext}`;

  return new Promise((resolve, reject) => {
    const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id: publicId,
        overwrite: true,
        context: { original_name: originalName },
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}

function buildResponse(
  originalName: string,
  mimeType: string,
  sizeBytes: number,
  publicId: string,
  secureUrl: string
) {
  const safeName = encodeURIComponent(originalName);
  const encodedId = encodeURIComponent(publicId);

  // Both preview and download stream via authenticated /api/docs/file endpoint
  // This bypasses Cloudinary Free tier restrictions on direct PDF delivery and guarantees
  // correct Content-Type (application/pdf) and exact filename extensions.
  const previewUrl = `/api/docs/file?publicId=${encodedId}&name=${safeName}&mode=inline`;
  const downloadUrl = `/api/docs/file?publicId=${encodedId}&name=${safeName}&mode=attachment`;

  const sizeStr = sizeBytes >= 1024 * 1024
    ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(sizeBytes / 1024).toFixed(1)} KB`;

  return {
    url: previewUrl,
    downloadUrl,
    cloudinaryUrl: secureUrl,
    name: originalName,
    size: sizeStr,
    type: mimeType,
    uploadedAt: new Date().toISOString().split('T')[0],
  };
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // 1. multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const category = formData.get('category') as string | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }

      let folder = 'seven-rocks/tenant-docs';
      if (category === 'check-in' || category === 'checkIn') {
        folder = 'seven-rocks/tenant-docs/check-in';
      } else if (category === 'check-out' || category === 'checkOut') {
        folder = 'seven-rocks/tenant-docs/check-out';
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mimeType = file.type || 'application/octet-stream';

      const { secureUrl, publicId } = await uploadToCloudinary(buffer, file.name, mimeType, folder);
      const responseData = buildResponse(file.name, mimeType, file.size, publicId, secureUrl);

      return NextResponse.json(responseData);
    }

    // 2. JSON base64 upload
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { dataUrl, filename, mimeType: rawMime, category } = body;

      if (!dataUrl) {
        return NextResponse.json({ error: 'dataUrl is required for JSON upload' }, { status: 400 });
      }

      let folder = 'seven-rocks/tenant-docs';
      if (category === 'check-in' || category === 'checkIn') {
        folder = 'seven-rocks/tenant-docs/check-in';
      } else if (category === 'check-out' || category === 'checkOut') {
        folder = 'seven-rocks/tenant-docs/check-out';
      }

      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const mimeType = rawMime || (matches ? matches[1] : 'application/octet-stream');
      const base64Data = matches ? matches[2] : dataUrl;
      const buffer = Buffer.from(base64Data, 'base64');

      const originalName = filename || 'document.pdf';
      const { secureUrl, publicId } = await uploadToCloudinary(buffer, originalName, mimeType, folder);
      const responseData = buildResponse(originalName, mimeType, buffer.length, publicId, secureUrl);

      return NextResponse.json(responseData);
    }

    return NextResponse.json(
      { error: 'Unsupported Content-Type. Use multipart/form-data or application/json' },
      { status: 415 }
    );
  } catch (error: any) {
    console.error('File upload failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload file' }, { status: 500 });
  }
}
