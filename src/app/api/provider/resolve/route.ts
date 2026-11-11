import { NextRequest, NextResponse } from 'next/server';

const MASTER_GATEWAY = (process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://api.snapflix.indevs.in').replace(/\/$/, '');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const authHeaders = {
      Accept: 'application/json',
      Referer: 'https://snapflix.indevs.in/',
      'X-SnapFlix-Client': 'snapflix-web',
    };

    const gwRes = await fetch(`${MASTER_GATEWAY}/api/v1/resolve?${searchParams.toString()}`, {
      headers: authHeaders,
      next: { revalidate: 3600 },
    });

    if (gwRes.ok) {
      const gwData = await gwRes.json();
      if (gwData?.success && (gwData?.streams?.length > 0 || gwData?.results?.length > 0 || gwData?.engines?.length > 0)) {
        return NextResponse.json(gwData, { status: 200, headers: CORS_HEADERS });
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: 'No streams available from SnapFlix Gateway.',
      },
      { status: 404, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[SnapFlix-Web API/Resolve Gateway Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to reach SnapFlix Gateway',
      },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
