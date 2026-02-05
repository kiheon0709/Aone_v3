import { supabase } from './supabase';
import { getCurrentUser } from './auth';

export interface SlideSummary {
  id: string;
  document_id: string;
  slide_number: number;
  summary_content: any; // TipTap JSON 형식
  user_notes_content: any; // TipTap JSON 형식
  created_at: string;
  updated_at: string;
}

/**
 * 슬라이드 요약을 생성합니다 (API 호출)
 */
export async function generateSlideSummaries(
  documentId: string,
  storagePath: string
): Promise<SlideSummary[]> {
  const response = await fetch('/api/summarize/slides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, storagePath }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '슬라이드 요약 생성 실패');
  }

  const data = await response.json();
  console.log('슬라이드 요약 생성 완료:', data.count, '개');
  
  // 생성된 요약 조회
  return await fetchSlideSummaries(documentId);
}

/**
 * 슬라이드 요약을 조회합니다.
 */
export async function fetchSlideSummaries(documentId: string): Promise<SlideSummary[]> {
  const { data, error } = await supabase
    .from('slide_summaries')
    .select('*')
    .eq('document_id', documentId)
    .order('slide_number', { ascending: true });

  if (error) {
    console.error('Error fetching slide summaries:', error);
    throw new Error(`슬라이드 요약 조회 실패: ${error.message}`);
  }

  return data || [];
}

/**
 * 슬라이드 요약 내용을 업데이트합니다 (사용자 편집)
 */
export async function updateSlideSummary(
  documentId: string,
  slideNumber: number,
  summaryContent: any, // TipTap JSON
): Promise<SlideSummary> {
  const { data, error } = await supabase
    .from('slide_summaries')
    .update({
      summary_content: summaryContent,
      updated_at: new Date().toISOString(),
    })
    .eq('document_id', documentId)
    .eq('slide_number', slideNumber)
    .select()
    .single();

  if (error) {
    console.error('Error updating slide summary:', error);
    throw new Error(`슬라이드 요약 업데이트 실패: ${error.message}`);
  }

  return data;
}

/**
 * 사용자 노트만 업데이트합니다.
 */
export async function updateUserNotes(
  documentId: string,
  slideNumber: number,
  userNotesContent: any // TipTap JSON
): Promise<SlideSummary> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  // 기존 요약이 있는지 확인
  const { data: existing } = await supabase
    .from('slide_summaries')
    .select('id, summary_content')
    .eq('document_id', documentId)
    .eq('slide_number', slideNumber)
    .single();

  if (existing) {
    // 업데이트
    const { data, error } = await supabase
      .from('slide_summaries')
      .update({
        user_notes_content: userNotesContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user notes:', error);
      throw new Error(`사용자 노트 업데이트 실패: ${error.message}`);
    }

    return data;
  } else {
    // 새로 생성 (summary_content는 빈 상태)
    const { data, error } = await supabase
      .from('slide_summaries')
      .insert({
        document_id: documentId,
        slide_number: slideNumber,
        summary_content: null,
        user_notes_content: userNotesContent,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user notes:', error);
      throw new Error(`사용자 노트 생성 실패: ${error.message}`);
    }

    return data;
  }
}

