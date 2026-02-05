# Aone 프로젝트 기술 스택 문서

## 프로젝트 개요

**프로젝트명**: Aone  
**설명**: 강의 녹음과 자료를 자유롭게 정리하는 AI 학습 파트너 웹 서비스

---

## 기술 스택 구성

### 프론트엔드

**Next.js 14+ (App Router)**
- React 기반 프레임워크
- 서버 컴포넌트 및 클라이언트 컴포넌트 활용
- API Routes 사용 (AI 작업 처리용)

**Tailwind CSS**
- 유틸리티 기반 CSS 프레임워크
- 반응형 디자인
- 커스터마이징 가능

**언어**: TypeScript

---

### 백엔드

**Supabase**
- 자동 생성되는 REST API
- 인증 시스템 내장 (Auth)
- 스토리지 자동 API
- Realtime 기능
- Row Level Security (RLS)

**Next.js API Routes / Supabase Edge Functions**
- AI 작업 처리 (PDF 파싱, STT, 요약 생성)
- Job 큐 처리
- 복잡한 비즈니스 로직

**AI/ML 라이브러리 (Node.js)**:
- `@google/generative-ai`: Gemini API (요약, Q&A, Embedding)
- `@google-cloud/speech`: Google Cloud Speech-to-Text API (STT)
- `pdf-parse` 또는 `pdf2pic`: PDF 처리
- `@ffmpeg/ffmpeg`: 오디오 처리 (필요시)

**언어**: TypeScript (Node.js)

---

### 데이터베이스

**Supabase PostgreSQL**
- 관리형 PostgreSQL 서비스
- pgvector 확장 사용 (벡터 임베딩 저장)
- 자동 백업
- SQL Editor 제공

**주요 확장**:
- `pgvector`: 벡터 유사도 검색

---

### 스토리지

**Supabase Storage**
- 파일 저장소 (PDF, 음성 파일)
- 버킷:
  - `documents`: PDF 파일
  - `audio`: 녹음 파일
- 자동 CDN
- 파일 URL 생성

---

### 인프라

**Supabase (BaaS)**
- Database, Auth, Storage 통합 관리
- 자동 API 생성
- Realtime 기능
- Row Level Security (RLS)

**Vercel (프론트엔드 배포)**
- Next.js 최적화 배포
- 자동 CI/CD
- 환경 변수 관리

**Supabase Edge Functions (선택)**
- 비동기 작업 처리
- 예: PDF 파싱, STT 처리, 요약 생성

---

### AI 서비스

**Google Gemini API**
- 문서 요약 생성 (슬라이드별/전체/폴더 요약)
- 이미지 캡션 생성 (PDF 도식 해석)
- PDF 처리 (멀티모달)
- Embedding: `text-embedding-004` (벡터 임베딩)
- Q&A: Gemini Flash / Pro (질문 답변)

**Google Cloud Speech-to-Text API**
- STT: 음성 인식 (한국어 지원 우수)
- 실시간 및 배치 전사 지원

---

## 아키텍처 구조

### 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 (브라우저)                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTPS
                     │
┌────────────────────▼────────────────────────────────────┐
│              Next.js Frontend (Vercel)                  │
│  - React Components                                     │
│  - Tailwind CSS                                         │
│  - Supabase Client                                      │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        │            │            │
┌───────▼───┐  ┌─────▼─────┐  ┌──▼──────────────┐
│  Supabase │  │  Next.js  │  │  Google AI APIs │
│  (DB/Auth │  │  API      │  │  - Gemini       │
│  /Storage)│  │  Routes   │  │  - Speech-to-Txt│
│           │  │  (AI 작업) │
│  - PostgreSQL                                           │
│  - Auth                                                 │
│  - Storage                                              │
└───────────┘  └───────────┘
```

---

## 프로젝트 구조

### 전체 디렉토리 구조

```
aone/
├── app/                         # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── folders/
│   │   └── [folderId]/
│   │       └── page.tsx
│   ├── api/                     # API Routes
│   │   ├── jobs/
│   │   │   └── route.ts         # Job 처리
│   │   ├── summaries/
│   │   │   └── route.ts         # 요약 생성
│   │   ├── stt/
│   │   │   └── route.ts         # STT 처리
│   │   └── qa/
│   │       └── route.ts         # Q&A 처리
│   └── layout.tsx
│
├── components/
│   ├── ui/                      # 재사용 가능한 UI 컴포넌트
│   ├── folders/
│   ├── files/
│   └── summaries/
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Supabase 클라이언트
│   │   └── server.ts            # 서버 사이드 클라이언트
│   ├── services/
│   │   ├── gemini.ts            # Gemini API (요약, Q&A, Embedding)
│   │   ├── speech-to-text.ts   # Google Cloud Speech-to-Text API
│   │   ├── pdf.ts               # PDF 처리
│   │   └── audio.ts             # 오디오 처리
│   ├── utils/
│   └── hooks/
│
├── styles/
│   └── globals.css
│
├── supabase/
│   ├── migrations/              # DB 마이그레이션
│   ├── functions/               # Edge Functions (선택)
│   └── config.toml
│
├── docs/                        # 문서
│   ├── PROJECT.md
│   ├── ARCHITECTURE.md
│   ├── FINAL_DESIGN.md
│   ├── TECH_STACK.md            # 이 문서
│   └── DESIGN_CONSIDERATIONS.md
│
├── package.json
└── tailwind.config.ts
```

---

## 주요 기술 선택 이유

### Supabase 선택 이유

1. **빠른 개발 속도**
   - 자동 API 생성 (CRUD 자동 생성)
   - 인증 시스템 내장
   - 스토리지 자동 API
   - 설정 시간 최소화

2. **완전 관리형 서비스**
   - Database, Auth, Storage 통합
   - 자동 백업
   - 관리 부담 최소

3. **무료 티어**
   - 초기 비용 0원
   - MVP 검증에 충분

4. **확장성**
   - 검증 후 Pro 플랜으로 업그레이드 가능

### Next.js + Tailwind CSS 선택 이유

1. **빠른 개발**
   - React 기반의 안정적인 프레임워크
   - 서버 컴포넌트로 성능 최적화

2. **Tailwind CSS**
   - 빠른 스타일링
   - 반응형 디자인 용이
   - 커스터마이징 가능

3. **TypeScript**
   - 타입 안정성
   - Supabase와 통합 용이

### AI 작업은 Next.js API Routes에서 처리

**이유:**
1. **Supabase는 BaaS**
   - DB, Auth, Storage는 자동 제공
   - 하지만 AI 작업은 별도 처리 필요

2. **Next.js API Routes 활용**
   - 서버 측에서 AI API 호출
   - PDF 파싱, STT, 요약 생성 처리

3. **비동기 작업**
   - Job 큐 테이블 기반
   - API Route에서 처리 또는 Edge Functions 활용

---

## 의존성 관리

### package.json

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "@supabase/supabase-js": "^2.38.0",
    "@supabase/ssr": "^0.0.10",
    "@google/generative-ai": "^0.2.0",
    "@google-cloud/speech": "^6.0.0",
    "pdf-parse": "^1.1.1",
    "zustand": "^4.4.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/pdf-parse": "^1.1.4",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 개발 환경 설정

### 프로젝트 초기화

```bash
# 프로젝트 생성
npx create-next-app@latest aone --typescript --tailwind --app

# 의존성 설치
npm install @supabase/supabase-js @supabase/ssr
npm install @google/generative-ai @google-cloud/speech pdf-parse
```

### Supabase 클라이언트 설정

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## 배포 전략

### Frontend
- **Vercel**
  - Next.js 최적화 배포
  - 자동 CI/CD
  - 환경 변수: Supabase URL, API 키

### Backend (Supabase)
- **Supabase 클라우드**
  - Database, Auth, Storage 자동 배포
  - Edge Functions (선택)

### AI 작업
- **Next.js API Routes**
  - Vercel에서 자동 배포
  - 서버리스 함수로 실행

---

## 환경 변수

### .env.local

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google AI API
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# 환경
NODE_ENV=development
```

---

## API 구조

### Supabase 자동 API (DB 기반)

```
GET    /rest/v1/folders          # 폴더 목록 조회
POST   /rest/v1/folders          # 폴더 생성
GET    /rest/v1/folders/{id}     # 폴더 상세 조회
PATCH  /rest/v1/folders/{id}     # 폴더 수정
DELETE /rest/v1/folders/{id}     # 폴더 삭제
```

### Next.js API Routes (AI 작업)

```
POST   /api/summaries            # 요약 생성
POST   /api/stt                  # STT 처리
POST   /api/qa                   # Q&A 처리
POST   /api/jobs/process         # Job 처리
```

### Supabase Auth

```
POST   /auth/v1/signup           # 회원가입
POST   /auth/v1/token            # 로그인
POST   /auth/v1/logout           # 로그아웃
GET    /auth/v1/user             # 현재 사용자
```

---

## 데이터베이스 스키마 (요약)

주요 테이블:
- `folders`: 폴더 (트리 구조, parent_id)
- `files`: 파일 (PDF, Audio)
- `slide_summaries`: 슬라이드별 요약
- `document_full_summaries`: 전체 요약
- `folder_summaries`: 폴더 요약
- `slide_audio_segments`: 슬라이드-음성 매칭
- `audio_transcripts`: STT 전사본
- `chunks`: RAG용 청크
- `chunk_embeddings`: 벡터 임베딩
- `jobs`: 비동기 작업 큐
- `qa_logs`: Q&A 로그

상세 스키마는 `FINAL_DESIGN.md` 참고

---

## 보안 고려사항

1. **인증**
   - Supabase Auth 사용 (자동 처리)
   - JWT 토큰 자동 관리
   - 비밀번호 해싱 자동 처리

2. **Row Level Security (RLS)**
   - 테이블별 RLS 정책 설정
   - 사용자별 데이터 접근 제어

3. **API 보안**
   - Supabase 자동 API는 RLS로 보호
   - Next.js API Routes는 서버 사이드에서만 실행
   - 환경 변수로 API 키 관리

4. **스토리지**
   - 버킷별 RLS 정책 설정
   - 사용자별 파일 접근 제어

---

## 성능 최적화

1. **프론트엔드**
   - Next.js 서버 컴포넌트 활용
   - 이미지 최적화
   - 코드 스플리팅

2. **데이터베이스**
   - pgvector 인덱스 최적화
   - 쿼리 최적화
   - Connection Pooling (Supabase 자동 관리)

3. **스토리지**
   - CDN 자동 제공
   - 파일 캐싱

---

## 모니터링 및 로깅

1. **Supabase Dashboard**
   - Database 메트릭
   - Auth 사용량
   - Storage 사용량
   - API 로그

2. **Vercel Analytics**
   - 프론트엔드 성능
   - API Routes 성능

3. **에러 추적 (선택)**
   - Sentry 등 외부 서비스

---

## 개발 워크플로우

1. **로컬 개발**
   - Frontend: `npm run dev`
   - Supabase: 클라우드 사용 또는 Supabase CLI로 로컬 개발

2. **DB 마이그레이션**
   - Supabase Dashboard SQL Editor
   - 또는 Supabase CLI

3. **배포**
   - Vercel: Git push 시 자동 배포
   - Supabase: 변경사항 자동 반영

---

## 다음 단계

1. ✅ Supabase 프로젝트 생성 및 설정
2. ✅ Database 스키마 생성 (마이그레이션)
3. ✅ Storage 버킷 생성
4. ✅ Next.js 프로젝트 초기 설정
5. ✅ Supabase 클라이언트 설정
6. ✅ 인증 시스템 구현 (Supabase Auth)
7. ✅ 기본 CRUD 구현 (Supabase 자동 API)
8. ✅ AI 작업 API Routes 구현

---

이 문서는 프로젝트의 기술 스택 기준 문서입니다. 변경 사항이 발생하면 업데이트해주세요.
