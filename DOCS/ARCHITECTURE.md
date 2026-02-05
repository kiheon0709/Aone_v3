# Aone 프로젝트 아키텍처 문서

이 문서는 FINAL_DESIGN.md의 최종 설계를 기반으로 한 전체 아키텍처와 기능별 파이프라인을 정리한 것입니다.

⸻

## 전체 아키텍처 한 장 요약

**Next.js (Frontend + API) + Supabase (DB/Auth/Storage) + Google AI APIs (Gemini / Speech-to-Text)**

- 파일(음성/PDF): Supabase Storage
- 데이터(슬라이드별 요약/전체 요약/폴더 요약/전사본/임베딩): Supabase Postgres + pgvector
- 비동기 처리(업로드 후 STT/요약/임베딩): Job 테이블 기반 워커(Next.js API Routes 또는 Edge Functions)

⸻

## 사용 모델 역할 분담

### Google AI (통합)
- **STT**: Google Cloud Speech-to-Text API (음성 인식, 한국어 지원 우수)
- **Embedding**: Gemini Embedding API (text-embedding-004) (벡터 임베딩)
- **슬라이드별 요약**: Gemini Flash 계열 (각 슬라이드 개별 요약)
- **전체 요약**: Gemini Flash 계열 (슬라이드별 요약 + 교수님 음성 종합)
- **폴더 요약**: Gemini Flash 계열 (여러 문서 요약 종합)
- **PDF 이미지 캡션**: Gemini 멀티모달 (도식/그래프 해석)
- **Q&A**: Gemini Flash / Pro (질문 답변)

⸻

## 기능별 파이프라인

### 1) PDF 업로드 → 슬라이드별 요약 생성 파이프라인

**입력**
- PDF 20~40페이지 (슬라이드/교재/프린트 혼합 가능)

**처리 흐름**
1. **업로드**
   - 클라이언트에서 Supabase Storage에 업로드
   - DB에 `files` 레코드 생성 (type='pdf')
   - `jobs` 생성 (status=pending, type=SLIDE_SUMMARY)

2. **PDF 파싱**
   - PDF를 페이지별로 분리
   - 각 페이지를 이미지로 변환

3. **슬라이드별 요약 생성 (Gemini Flash)**
   - 각 슬라이드를 개별적으로 RAG로 요약 생성
   - 비동기 처리 (Job 큐 활용)
   - 생성 완료된 슬라이드부터 UI에 표시 (점진적 로딩)

4. **저장**
   - `slide_summaries` 테이블에 각 슬라이드별로 저장
   - `chunks` 테이블에 RAG용 청크 생성 (선택적)

⸻

### 2) 녹음 파일 업로드 → STT → 슬라이드 매칭 파이프라인

**입력**
- 60~90분 음성 파일 (mp3/m4a/wav)
- 여러 번 녹음 가능 (쉬는시간, 퀴즈시간 대비)

**처리 흐름**
1. **업로드**
   - 클라이언트에서 Supabase Storage에 업로드
   - DB에 `files` 레코드 생성 (type='audio')
   - 사용자가 "녹음 완료" 버튼 클릭 시 다음 단계 진행

2. **STT 처리 (Google Cloud Speech-to-Text)**
   - 사용자가 선택한 녹음 파일들 STT 처리
   - Google Cloud Speech-to-Text API로 전사
   - 한국어 인식 최적화 설정
   - `audio_transcripts` 테이블에 원문 저장

3. **전사본 정제**
   - 말더듬 제거
   - 문장 정리
   - 교수님 말씀만 추출 (학생 질문 등 제외)
   - `audio_transcripts.refined_text`에 저장

4. **슬라이드-음성 매칭**
   - 타임스탬프 기반 대략적인 구간 추정
   - RAG로 정확한 구간 찾기
   - 슬라이드 순서대로 매칭 (시간순 선형)
   - `slide_audio_segments` 테이블에 저장

5. **강조 부분 감지**
   - 이미 슬라이드에 연결된 구간과 유사한 내용을 다시 말한 경우
   - → 강조로 판단하여 `is_highlight=true`로 저장

⸻

### 3) 전체 요약 생성 파이프라인

**생성 시점**
- 사용자가 "전체요약하기" 버튼 클릭 시

**처리 흐름**
1. **슬라이드별 요약 수집**
   - AI 생성 요약 + 사용자 수정 내용 포함
   - `slide_summaries` 테이블에서 조회

2. **교수님 설명 텍스트 수집 (있으면)**
   - `audio_transcripts.refined_text` 조회
   - 강조된 부분 정보 포함

3. **전체 요약 생성 (Gemini Flash)**
   - 가중치 적용: 교수님 말씀 70%, 슬라이드 요약 30%
   - 강조된 부분 특별히 명시
   - 프롬프트에 가중치 명시

4. **강조 부분 마크업 적용**
   - 강조된 부분은 배경색(#ffeb3b) + 밑줄로 표시
   - 기존 강조 정보 활용 + 새로운 강조 추가

5. **저장**
   - `document_full_summaries` 테이블에 저장

⸻

### 4) 폴더 요약 생성 파이프라인

**생성 시점**
- 사용자가 "폴더 요약하기" 버튼 클릭 시
- 문서/폴더 선택 화면에서 선택한 항목들 기반

**처리 흐름**
1. **선택된 폴더/문서 재귀적으로 조회**
   - 기본적으로 모든 항목 선택됨
   - 사용자가 선택/해제 가능

2. **각 항목의 요약 텍스트 수집**
   - **폴더**: 폴더 요약이 있으면 그것 사용, 없으면 하위 문서 요약 사용 (재귀적)
   - **문서**: 전체 요약이 있으면 전체 요약, 없으면 슬라이드별 요약 합치기

3. **폴더 요약 생성 (Gemini Flash)**
   - 수집된 텍스트들을 종합하여 폴더 요약 생성

4. **저장**
   - `folder_summaries` 테이블에 저장 (폴더당 1개)

**업데이트**
- 새 문서 추가 시 자동 무효화 없음
- 사용자가 "요약하기" 버튼 다시 클릭 시 재생성
- 기존 요약은 그대로 유지

⸻

### 5) RAG Q&A 파이프라인

**목표**
"내 자료(슬라이드별 요약/전체 요약/전사본)에 근거해서 답변 + 출처 표시"

**처리 흐름**
1. **질문 입력**

2. **검색 스코프 결정**
   - 기본: 전체 자료 검색
   - 옵션: 특정 폴더 하나 또는 여러 폴더 선택하여 검색 범위 제한
   - 하위 폴더 포함 옵션: 선택한 폴더 + 하위 폴더 모두 포함

3. **Retrieval (벡터 검색)**
   - 질문을 임베딩 → pgvector에서 top-k chunk 검색 (선택된 folder_id 범위 내)
   - `chunks` 테이블에서 검색
   - `source_type`에 따라 슬라이드별 요약, 전체 요약, 전사본 등 포함

4. **Answer 생성 (Gemini Flash / Pro)**
   - 입력: (질문 + top-k 근거 chunks + 메타)
   - 출력: 설명형 답변 + 출처
   - 출처 예시:
     - "폴더명: 강의자료, PDF 슬라이드 14"
     - "폴더명: 녹음파일, 38:10~39:05"

5. **저장**
   - `qa_logs`에 질문/사용 근거/답변/검색 범위(folder_id들) 저장

⸻

## Supabase 기반 DB 구조 (핵심 테이블)

### 폴더 및 파일
- `folders`: 폴더 트리 구조 (parent_id 기반)
- `files`: 업로드 파일 메타 (type: 'pdf', 'audio')

### 요약 관련
- `slide_summaries`: 슬라이드별 요약 (document_id, slide_number, summary_text, user_notes)
- `document_full_summaries`: 전체 요약 (document_id, summary_text, highlighted_text)
- `folder_summaries`: 폴더 요약 (folder_id, summary_text)

### 음성 관련
- `audio_transcripts`: STT 전사본 (audio_file_id, raw_text, refined_text)
- `slide_audio_segments`: 슬라이드-음성 매칭 (slide_summary_id, audio_file_id, start_time, end_time, is_highlight)

### RAG 관련
- `chunks`: RAG용 청크 (folder_id, file_id, chunk_text, source_type, metadata)
- `chunk_embeddings`: 벡터 임베딩 (chunk_id, embedding)

### 기타
- `jobs`: 비동기 작업 큐 (status, type, payload)
- `qa_logs`: 질문/답변 기록 (question, answer, sources, folder_ids)

**포인트**: 모든 데이터는 `folder_id`로 연결되며, 폴더는 `parent_id`로 트리 구조를 형성한다.

⸻

## 프로젝트 폴더 구조 (Next.js 기준)

```
/app
  /(auth) ...
  /dashboard
    page.tsx              // 대시보드 (폴더 트리 뷰)
  /folders/[folderId]
    page.tsx              // 폴더 상세(업로드/요약/질문/하위 폴더)
  /documents/[documentId]
    page.tsx              // 문서 상세 (슬라이드별 요약/전체 요약/녹음)
  /api
    /folders/route.ts     // 폴더 CRUD
    /upload/route.ts      // 업로드 메타 생성
    /jobs/run/route.ts    // (cron/trigger) pending job 처리
    /summaries/
      /slides/route.ts    // 슬라이드별 요약 생성
      /full/route.ts      // 전체 요약 생성
      /folder/route.ts    // 폴더 요약 생성
    /stt/route.ts         // STT 처리
    /audio-match/route.ts // 슬라이드-음성 매칭
    /qa/route.ts          // 질문 -> RAG -> 답변
/lib
  supabase.ts
  rag/
    chunk.ts
    embed.ts
    retrieve.ts
  pipelines/
    slide-summary.ts      // 슬라이드별 요약 생성
    full-summary.ts       // 전체 요약 생성
    folder-summary.ts    // 폴더 요약 생성
    stt.ts
    audio-match.ts        // 슬라이드-음성 매칭
    jobRunner.ts
  folders/
    tree.ts               // 폴더 트리 구조 유틸
```

⸻

## 구현 우선순위 (MVP 로드맵)

### v1 (2~3주 MVP)
- 폴더 트리 구조 (생성/삭제/이름 변경/이동)
- PDF 업로드 → 슬라이드별 요약 자동 생성
- 슬라이드별 요약 수정 (자동 저장, Ctrl+Z)
- 녹음 기능 (녹음, 완료, 파일 선택)
- 슬라이드-음성 매칭
- 전체 요약 생성 (가중치 적용)
- 폴더 요약 생성
- 기본 UI (좌측 PDF, 우측 요약)

### v1.5
- 강조 부분 감지 및 표시
- 전체 요약에서 강조 부분 하이라이트
- 참조 버튼 기능 (슬라이드로 이동)
- 폴더 요약 선택 UI 개선

### v2
- 화자 분리 (교수/학생)
- 퀴즈 생성
- 오답노트
- 요약 버전 관리 (히스토리)

⸻

## 참고 문서

- **FINAL_DESIGN.md**: 최종 설계 상세 사항
- **DESIGN_CONSIDERATIONS.md**: 구현 시 고려사항
- **TECH_STACK.md**: 기술 스택 상세
