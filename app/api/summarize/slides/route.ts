import { NextRequest, NextResponse } from 'next/server';
import { geminiJsonModel, SLIDE_SUMMARY_PROMPT } from '@/lib/gemini';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60; // 최대 60초 (Vercel Pro plan)

export async function POST(request: NextRequest) {
  try {
    const { documentId, storagePath } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되어 있지 않습니다. (.env 확인)' },
        { status: 500 }
      );
    }

    if (!documentId || !storagePath) {
      return NextResponse.json(
        { error: 'documentId와 storagePath가 필요합니다.' },
        { status: 400 }
      );
    }

    // Supabase Storage에서 PDF 다운로드
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    console.log('PDF 다운로드 시작:', storagePath);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('files')
      .download(storagePath);

    if (downloadError) {
      console.error('PDF 다운로드 실패:', downloadError);
      return NextResponse.json(
        { error: 'PDF 파일 다운로드 실패', details: downloadError.message },
        { status: 404 }
      );
    }

    // PDF를 Base64로 변환
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Pdf = buffer.toString('base64');

    console.log('PDF 크기:', Math.round(buffer.length / 1024), 'KB');
    console.log('Gemini API 호출 시작 (JSON 모드)...');

    // Gemini API 호출 (JSON 모드)
    const result = await geminiJsonModel.generateContent([
      SLIDE_SUMMARY_PROMPT,
      {
        inlineData: {
          data: base64Pdf,
          mimeType: 'application/pdf',
        },
      } as any,
    ]);

    const response = await result.response;
    const text = response.text();

    console.log('Gemini 응답 길이:', text.length);

    // JSON 파싱 (JSON 모드에서는 이미 유효한 JSON)
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError: any) {
      console.error('JSON 파싱 실패:', parseError.message);
      console.error('응답 샘플:', text.substring(0, 1000));
      
      // 혹시 몰라 정규식으로 JSON 추출 시도
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e) {
          return NextResponse.json(
            { 
              error: 'Gemini 응답을 JSON으로 파싱할 수 없습니다.', 
              details: parseError.message,
              sample: text.substring(0, 500)
            },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { 
            error: 'Gemini 응답에서 JSON을 찾을 수 없습니다.', 
            details: text.substring(0, 500)
          },
          { status: 500 }
        );
      }
    }

    if (!parsed?.summaries || !Array.isArray(parsed.summaries)) {
      console.error('Gemini 응답 구조 오류:', Object.keys(parsed || {}));
      return NextResponse.json(
        { 
          error: 'Gemini가 유효한 summaries 배열을 반환하지 않았습니다.', 
          details: JSON.stringify(parsed).substring(0, 500)
        },
        { status: 500 }
      );
    }

    console.log('슬라이드 요약 개수:', parsed.summaries.length);

    // 간단한 형식을 TipTap JSON으로 변환
    const convertToTipTapJson = (title: string, bullets: string[]) => {
      return {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 3 },
            content: [{ type: "text", text: title }]
          },
          {
            type: "bulletList",
            content: bullets.map(bullet => ({
              type: "listItem",
              content: [{
                type: "paragraph",
                content: [{ type: "text", text: bullet }]
              }]
            }))
          }
        ]
      };
    };

    // DB에 저장 (TipTap JSON으로 변환)
    const summariesToInsert = parsed.summaries.map((s: any) => ({
      document_id: documentId,
      slide_number: s.slide_number,
      summary_content: convertToTipTapJson(s.title || `슬라이드 ${s.slide_number}`, s.bullets || []),
      user_notes_content: null,
    }));

    const { error: insertError } = await supabase
      .from('slide_summaries')
      .upsert(summariesToInsert, {
        onConflict: 'document_id,slide_number'
      });

    if (insertError) {
      console.error('DB 저장 실패:', insertError);
      return NextResponse.json(
        { error: 'DB 저장 실패', details: insertError.message },
        { status: 500 }
      );
    }

    console.log('슬라이드 요약 저장 완료');

    return NextResponse.json({ 
      success: true, 
      summaries: parsed.summaries,
      count: parsed.summaries.length
    });
  } catch (error: any) {
    console.error('슬라이드 일괄 요약 오류:', error);
    return NextResponse.json(
      {
        error: '슬라이드 일괄 요약에 실패했습니다.',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
