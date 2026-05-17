import { NextRequest, NextResponse } from 'next/server';
import { parseMultipleOcrTexts } from '@/lib/vepay-core';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texts, lang, includeRawText } = body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: 'No texts provided', receipts: [], summary: { total: 0, complete: 0, incomplete: 0, errors: 0 }, errors: [] },
        { status: 400 }
      );
    }

    const { receipts, errors } = parseMultipleOcrTexts(texts, {
      lang: lang || 'spa+eng',
      includeRawText: includeRawText !== false,
    });

    const complete = receipts.filter(r => r.validation.is_complete).length;
    const incomplete = receipts.length - complete;

    return NextResponse.json({
      request_id: crypto.randomUUID?.() || Date.now().toString(16),
      schema_version: 'vepay_api_receipt_v1',
      receipts,
      summary: {
        total: texts.length,
        complete,
        incomplete,
        errors: errors.length,
      },
      errors,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to parse receipt',
        details: message,
        receipts: [],
        summary: { total: 0, complete: 0, incomplete: 0, errors: 1 },
        errors: [{ filename: 'unknown', code: 'server_error', message }],
      },
      { status: 500 }
    );
  }
}
