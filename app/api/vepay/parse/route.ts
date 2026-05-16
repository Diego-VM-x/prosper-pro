import { NextRequest, NextResponse } from 'next/server';

const VEPAY_API_URL = process.env.VEPAY_API_URL || process.env.NEXT_PUBLIC_VEPAY_API_URL || 'http://127.0.0.1:8080';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const proxyForm = new FormData();
    files.forEach((file) => {
      proxyForm.append('files', file, file.name);
    });
    proxyForm.append('include_raw_text', formData.get('include_raw_text') || 'false');
    proxyForm.append('enable_crops', formData.get('enable_crops') || 'true');

    const response = await fetch(`${VEPAY_API_URL}/v1/receipts/parse`, {
      method: 'POST',
      body: proxyForm,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `VEPay API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to process receipt', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
