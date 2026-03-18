import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-config';
import { getCurrentUser } from '@/lib/auth-config';
import { v2 as cloudinary } from 'cloudinary';

export const runtime = 'nodejs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: Number(process.env.CLOUDINARY_TIMEOUT_MS || 120000),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');

    let sqlQuery = `
      SELECT 
        p.*,
        u.name as taker_name
      FROM photos p
      LEFT JOIN users u ON p.taken_by = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (entityType) {
      sqlQuery += ' AND p.entity_type = ?';
      params.push(entityType);
    }

    if (entityId) {
      sqlQuery += ' AND p.entity_id = ?';
      params.push(entityId);
    }

    sqlQuery += ' ORDER BY p.taken_at DESC';

    const photos = await query(sqlQuery, params);

    return NextResponse.json(photos);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Wymagane logowanie', requestId },
        { status: 401 }
      );
    }

    // Check Cloudinary config
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Missing Cloudinary configuration');
      return NextResponse.json(
        { error: 'Cloudinary not configured - missing environment variables', requestId },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entity_type') as string;
    const entityId = formData.get('entity_id') as string;
    const takenBy = String(user.id);

    console.log('Photo upload request:', {
      requestId,
      userId: user.id,
      userEmail: user.email,
      entityType,
      entityId,
      takenBy,
      fileSize: file?.size,
      fileName: file?.name,
      fileType: (file as any)?.type
    });

    if (!file || !(file instanceof File) || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing required fields', requestId },
        { status: 400 }
      );
    }

    const fileName = file?.name || '';
    const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';

    const configuredMaxMbRaw = (process.env.PHOTO_MAX_MB || '').trim();
    const configuredMaxMb = configuredMaxMbRaw ? Number(configuredMaxMbRaw) : 25;
    const maxFileSizeBytes = Number.isFinite(configuredMaxMb) && configuredMaxMb > 0
      ? Math.round(configuredMaxMb * 1024 * 1024)
      : 0;
    const fileSizeBytes = typeof file.size === 'number' ? file.size : NaN;
    const fileSizeMb = Number.isFinite(fileSizeBytes) ? Math.round((fileSizeBytes / (1024 * 1024)) * 100) / 100 : NaN;

    if (maxFileSizeBytes > 0 && Number.isFinite(fileSizeBytes) && fileSizeBytes > maxFileSizeBytes) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: `fileName=${fileName || '(unknown)'} fileSizeMB=${Number.isFinite(fileSizeMb) ? fileSizeMb : '(unknown)'} fileType=${(file as any)?.type || '(empty)'} ext=${ext || '(none)'} maxMB=${configuredMaxMb}`,
          requestId
        },
        { status: 413 }
      );
    }

    const EXT_TO_MIME: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      avif: 'image/avif',
      gif: 'image/gif',
      heic: 'image/heic',
      heif: 'image/heif'
    };

    const mimeFromExt = ext && EXT_TO_MIME[ext] ? EXT_TO_MIME[ext] : '';
    const mimeFromFile = typeof file.type === 'string' ? file.type.trim().toLowerCase() : '';
    const isImageMime = mimeFromFile.startsWith('image/');
    const isKnownExt = Boolean(mimeFromExt);

    // Reject obvious non-image files (but allow empty file.type if ext suggests image)
    if (mimeFromFile && !isImageMime && !isKnownExt) {
      return NextResponse.json(
        {
          error: 'Unsupported media type',
          details: `fileName=${fileName || '(unknown)'} fileSizeMB=${Number.isFinite(fileSizeMb) ? fileSizeMb : '(unknown)'} file.type=${mimeFromFile || '(empty)'} ext=${ext || '(none)'}`,
          requestId
        },
        { status: 415 }
      );
    }

    const isHeic =
      ext === 'heic' ||
      ext === 'heif' ||
      (typeof file.type === 'string' && file.type.toLowerCase().includes('heic')) ||
      (typeof file.type === 'string' && file.type.toLowerCase().includes('heif'));

    // Convert file to base64 for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Some mobile browsers send empty/unknown file.type, especially for HEIC.
    const contentType = mimeFromFile || (isHeic ? 'image/heic' : mimeFromExt || 'application/octet-stream');
    const dataURI = `data:${contentType};base64,${base64}`;

    console.log('Uploading to Cloudinary...');

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: 'park-m-trees',
      resource_type: 'image',
      ...(isHeic ? { format: 'jpg' } : {}),
    });

    const originalUrl = uploadResult.secure_url;
    const filename = uploadResult.public_id;

    // Prefer an URL that browsers can render (HEIC often can't render in <img>).
    // If Cloudinary already returned JPG (forced format), keep it.
    let url = originalUrl;
    if (typeof originalUrl === 'string' && originalUrl.includes('res.cloudinary.com')) {
      const withImageUpload = originalUrl
        .replace('/raw/upload/', '/image/upload/')
        .replace('/video/upload/', '/image/upload/');

      if (isHeic && !withImageUpload.includes('/f_jpg')) {
        url = withImageUpload.replace('/image/upload/', '/image/upload/f_jpg,q_auto/');
      } else {
        url = withImageUpload.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
      }
    }

    console.log('Cloudinary upload successful:', { originalUrl, url, filename, ext, isHeic });

    // Save to database
    await query(
      'INSERT INTO photos (entity_type, entity_id, filename, url, taken_by) VALUES (?, ?, ?, ?, ?)',
      [entityType, entityId, filename, url, takenBy]
    );

    console.log('Photo saved to database successfully');

    return NextResponse.json({
      url,
      filename,
      message: 'Photo uploaded successfully',
      requestId
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload photo',
        details: (error as Error).message,
        requestId
      },
      { status: 500 }
    );
  }
}
