import { NextRequest, NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';

export const runtime = 'nodejs';

const TRANSCRIPT_SUMMARY_PROMPT = `
당신은 최고의 강의 보조 AI입니다.
아래는 교수님 강의 녹음 전사 텍스트입니다. 이를 학생이 보기 좋게 정리해 주세요.
요구사항: 한국어, 군더더기/반복 제거, 핵심 개념 위주. 결과는 "notesText" 하나만 포함한 JSON만 반환.
출력 예시: { "notesText": "..." }
전사 텍스트:
`;

export async function POST(request: NextRequest) {
  try {
    const { transcriptText } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되어 있지 않습니다.' },
        { status: 500 }
      );
    }

    if (!transcriptText || typeof transcriptText !== 'string' || transcriptText.trim().length === 0) {
      return NextResponse.json({ error: 'transcriptText가 비어있습니다.' }, { status: 400 });
    }

    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: TRANSCRIPT_SUMMARY_PROMPT }, { text: transcriptText }] }],
      generationConfig: { responseMimeType: 'application/json' },
    } as any);

    const text = (await result.response).text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) parsed = JSON.parse(text.slice(start, end + 1));
    }

    const coerceToString = (v: any): string => {
      if (v == null) return '';
      if (typeof v === 'string') return v;
      if (Array.isArray(v)) return v.map(coerceToString).filter(Boolean).join('\n');
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    };

    let notesText =
      parsed?.notesText ?? parsed?.notes_text ?? parsed?.notes ?? parsed?.text ?? parsed?.summary ?? (typeof parsed === 'string' ? parsed : '');
    if (!notesText || typeof notesText !== 'string') notesText = typeof text === 'string' ? text : coerceToString(text);
    notesText = String(notesText).trim();

    if (!notesText) {
      return NextResponse.json(
        { error: '전사 텍스트 정리 결과가 비어있습니다.', details: typeof text === 'string' ? text.slice(0, 2000) : String(text) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, notesText });
  } catch (e: any) {
    console.error('Summarize transcript error:', e);
    return NextResponse.json(
      { error: '전사 텍스트 정리에 실패했습니다.', details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
