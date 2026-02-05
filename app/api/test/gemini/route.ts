import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';

export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('Gemini API 테스트 시작...');
    console.log('GEMINI_API_KEY 존재:', !!process.env.GEMINI_API_KEY);
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'GEMINI_API_KEY가 설정되어 있지 않습니다.',
          env_check: {
            GEMINI_API_KEY: 'NOT SET',
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
            SUPABASE_SECRET_KEY: !!process.env.SUPABASE_SECRET_KEY ? 'SET' : 'NOT SET',
          }
        },
        { status: 500 }
      );
    }

    // 간단한 텍스트 생성 테스트
    const result = await geminiModel.generateContent('안녕하세요! 간단히 인사해주세요.');
    const response = await result.response;
    const text = response.text();

    console.log('Gemini 응답:', text);

    return NextResponse.json({
      success: true,
      message: 'Gemini API 연결 성공!',
      response: text,
      env_check: {
        GEMINI_API_KEY: 'SET',
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
        SUPABASE_SECRET_KEY: !!process.env.SUPABASE_SECRET_KEY ? 'SET' : 'NOT SET',
      }
    });
  } catch (error: any) {
    console.error('Gemini API 테스트 실패:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || String(error),
        stack: error?.stack,
      },
      { status: 500 }
    );
  }
}
