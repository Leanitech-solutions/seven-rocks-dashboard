import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';

export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extract the Cloudinary public_id from a raw public_id or full Cloudinary URL.
 */
function extractPublicId(urlOrId: string): string {
  if (!urlOrId.startsWith('http://') && !urlOrId.startsWith('https://')) {
    return urlOrId;
  }
  try {
    const url = new URL(urlOrId);
    const parts = url.pathname.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return urlOrId;

    let remaining = parts.slice(uploadIdx + 1);
    while (remaining.length > 0) {
      const segment = remaining[0];
      if (segment.startsWith('v') && /^\d+$/.test(segment.slice(1))) {
        remaining = remaining.slice(1);
        break;
      } else if (
        segment.startsWith('fl_') ||
        segment.includes('_') ||
        segment.includes(',') ||
        segment.includes(':')
      ) {
        remaining = remaining.slice(1);
      } else {
        break;
      }
    }
    return remaining.join('/');
  } catch {
    return urlOrId;
  }
}

/**
 * Determine the correct MIME type based on filename, extension, or buffer header.
 */
function getMimeType(filename: string, buffer?: Buffer): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.txt') return 'text/plain';

  // Check magic bytes in buffer if extension was missing
  if (buffer && buffer.length >= 5) {
    if (buffer.slice(0, 5).toString() === '%PDF-') {
      return 'application/pdf';
    }
    if (buffer[0] === 0x89 && buffer.slice(1, 4).toString() === 'PNG') {
      return 'image/png';
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return 'image/jpeg';
    }
  }

  return 'application/octet-stream';
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPublicId = searchParams.get('publicId') || searchParams.get('id');
    const filename = searchParams.get('name') || 'document.pdf';
    const mode = searchParams.get('mode') === 'attachment' ? 'attachment' : 'inline';

    if (!rawPublicId) {
      return NextResponse.json({ error: 'Missing publicId parameter' }, { status: 400 });
    }

    const publicId = extractPublicId(rawPublicId);

    // Generate an authenticated download URL with Cloudinary secret
    // This allows secure streaming even when direct CDN delivery is restricted (e.g. Free-tier PDF restrictions)
    const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 minutes
    const privateUrl = cloudinary.utils.private_download_url(publicId, '', {
      resource_type: 'raw',
      type: 'upload',
      expires_at: expiresAt,
    });

    const upstreamRes = await fetch(privateUrl);
    if (!upstreamRes.ok) {
      // If raw failed, attempt image resource_type
      const imagePrivateUrl = cloudinary.utils.private_download_url(publicId, '', {
        resource_type: 'image',
        type: 'upload',
        expires_at: expiresAt,
      });
      const imageRes = await fetch(imagePrivateUrl);
      if (!imageRes.ok) {
        return NextResponse.json(
          { error: `Document not found in Cloudinary (${publicId})` },
          { status: 404 }
        );
      }
      const buffer = Buffer.from(await imageRes.arrayBuffer());
      const mimeType = getMimeType(filename, buffer);

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `${mode}; filename="${encodeURIComponent(filename)}"`,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = getMimeType(filename, buffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `${mode}; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Document stream error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to stream document' },
      { status: 500 }
    );
  }
}
