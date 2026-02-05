import { NextRequest, NextResponse } from 'next/server';
import { geminiModel, FULL_SUMMARY_PROMPT } from '@/lib/gemini';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { slidesText } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되어 있지 않습니다. (.env 확인)' },
        { status: 500 }
      );
    }

    if (!slidesText || typeof slidesText !== 'string' || slidesText.trim().length === 0) {
      return NextResponse.json(
        { error: 'slidesText가 비어있습니다. 먼저 슬라이드 요약을 생성해 주세요.' },
        { status: 400 }
      );
    }

    const result = await geminiModel.generateContent([FULL_SUMMARY_PROMPT, slidesText]);
    const response = await result.response;
    const fullSummaryText = response.text();

    const jsonMatch = fullSummaryText.match(/\{[\s\S]*\}/);
    const summaryJson = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!summaryJson) {
      throw new Error('Gemini가 유효한 JSON 형식을 반환하지 않았습니다.');
    }

    return NextResponse.json({ success: true, summary: summaryJson });
  } catch (error: any) {
    console.error('전체 요약 오류:', error);
    return NextResponse.json(
      { error: '전체 요약에 실패했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
