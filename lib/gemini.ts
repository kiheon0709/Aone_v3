import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// 모델명은 .env의 GEMINI_MODEL로 오버라이드 가능 (기본: gemini-1.5-flash)
const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

// 기본 모델 (텍스트 생성)
export const geminiModel = genAI.getGenerativeModel({ model: modelName });

// JSON 응답 전용 모델 (구조화된 출력 보장)
export const geminiJsonModel = genAI.getGenerativeModel({ 
  model: modelName,
  generationConfig: {
    responseMimeType: "application/json",
  }
});

// 슬라이드별 요약 생성 프롬프트 (초간단 형식)
export const SLIDE_SUMMARY_PROMPT = `
당신은 강의 보조 AI입니다.
PDF 슬라이드를 보고, 각 슬라이드의 핵심만 2-3줄로 아주 간단히 요약해주세요.

## 목적
- 수업 듣기 전 슬라이드 미리보기용
- 이미지나 영어 내용이 무슨 의미인지 빠르게 파악
- 자세한 내용은 수업 들으면서 직접 필기할 예정

## 출력 규칙
- 반드시 JSON만 출력 (마크다운/설명 금지)
- 각 슬라이드당 2-3개 bullet만 (핵심만!)
- 한국어로 작성
- 간단 명료하게
- **title은 영어라도 무조건 한글로 번역해서 다듬기** (자연스럽게)

## 형식
{
  "summaries": [
    {
      "slide_number": 1,
      "title": "간단한 제목 (한글로)",
      "bullets": ["핵심 1", "핵심 2"]
    }
  ]
}

## 예시
{
  "summaries": [
    {
      "slide_number": 1,
      "title": "디자인 패턴 소개",
      "bullets": [
        "재사용 가능한 설계 해결책",
        "GoF의 23가지 패턴"
      ]
    },
    {
      "slide_number": 2,
      "title": "싱글톤 패턴",
      "bullets": [
        "인스턴스 하나만 생성",
        "전역 접근 제공"
      ]
    }
  ]
}

이제 PDF의 모든 슬라이드를 위 형식으로 요약해주세요.
`;

// 전체 요약 생성 프롬프트
export const FULL_SUMMARY_PROMPT = `
당신은 복잡한 강의 내용을 유기적으로 연결하여 종합적인 서술형 요약을 작성하는 전문가입니다.
제공된 모든 슬라이드 요약 정보와 사용자가 직접 수정한 텍스트들을 종합하여, 전체 강의의 흐름을 꿰뚫는 '전체 요약'을 작성해 주세요.

## 요약 가이드라인:
1. **서론**: 본 강의의 전반적인 목적과 배경을 설명하세요.
2. **본론**: 주요 주제별로 섹션을 나누어 상세히 설명하세요. 슬라이드 간의 유기적인 연결 관계(원인-결과, 사례 등)를 강조하세요.
3. **결론**: 강의의 핵심 시사점이나 요약을 마무리하세요.
4. 전문적이고 가독성 높게 작성하세요.
5. 결과물은 반드시 TipTap 에디터 JSON 형식을 따라야 합니다.
6. 한국어로 작성하세요.

## 입력 데이터 (JSON):
`;
