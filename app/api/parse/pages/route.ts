import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const storagePath = body?.storagePath;

    if (!storagePath || typeof storagePath !== 'string') {
      return NextResponse.json({ error: 'storagePath가 필요합니다.' }, { status: 400 });
    }

    let supabase;
    try {
      supabase = createServerClient();
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error('Supabase 클라이언트 생성 실패:', msg);
      return NextResponse.json(
        { error: '서버 설정 오류', details: msg },
        { status: 500 }
      );
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('files')
      .download(storagePath);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'PDF 파일을 불러올 수 없습니다.', details: downloadError?.message || 'download failed' },
        { status: 404 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // pdf-parse/index.js는 로드 시 테스트 파일을 열어 ENOENT 발생 → lib만 직접 로드
    const pdfParseMod = await import('pdf-parse/lib/pdf-parse.js');
    const pdfParse = pdfParseMod.default ?? pdfParseMod;
    if (typeof pdfParse !== 'function') {
      return NextResponse.json(
        { error: 'PDF 파서 로드 실패', details: 'pdf-parse가 함수가 아닙니다.' },
        { status: 500 }
      );
    }

    const data = await pdfParse(buffer);
    const numPages = data.numpages ?? 1;
    const fullText = (data.text ?? '').trim();

    return NextResponse.json({
      success: true,
      numPages,
      pages: [{ slide_number: 1, text: fullText }],
    });
  } catch (error: any) {
    const message = error?.message ?? String(error);
    console.error('페이지 텍스트 추출 오류:', message);
    return NextResponse.json(
      { error: '페이지 텍스트 추출에 실패했습니다.', details: message },
      { status: 500 }
    );
  }
}
