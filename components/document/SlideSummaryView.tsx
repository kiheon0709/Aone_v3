"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, ChevronUp, Play } from "lucide-react";
import TipTapEditor from "./TipTapEditor";
import { updateSlideSummary, fetchSlideSummaries } from "@/lib/slideSummaries";

interface SlideSummary {
  slideNumber: number;
  title: string;
  summaryContent: any; // TipTap JSON (AI 요약 + 사용자 편집 통합)
  audioSegments: any[];
}

interface SlideSummaryViewProps {
  documentId: string;
  slideSummaries: SlideSummary[];
  currentSlide: number;
  onSlideChange: (slide: number) => void;
}

export default function SlideSummaryView({
  documentId,
  slideSummaries,
  currentSlide,
  onSlideChange,
}: SlideSummaryViewProps) {
  const [expandedAudio, setExpandedAudio] = useState<number | null>(null);
  const [summaries, setSummaries] = useState<SlideSummary[]>(slideSummaries);
  const [saving, setSaving] = useState<{ [key: number]: boolean }>({});
  const saveTimeouts = useRef<{ [key: number]: NodeJS.Timeout }>({});
  const slideRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  useEffect(() => {
    setSummaries(slideSummaries);
  }, [slideSummaries]);

  // 현재 슬라이드 변경 시 해당 요약으로 스크롤
  useEffect(() => {
    const slideRef = slideRefs.current[currentSlide];
    if (slideRef) {
      slideRef.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [currentSlide]);

  // DB에서 요약 데이터 로드
  useEffect(() => {
    const loadSummaries = async () => {
      try {
        const dbSummaries = await fetchSlideSummaries(documentId);
        setSummaries(prev => {
          const updated = [...prev];
          dbSummaries.forEach(dbSummary => {
            const index = updated.findIndex(s => s.slideNumber === dbSummary.slide_number);
            if (index >= 0) {
              updated[index] = {
                ...updated[index],
                summaryContent: dbSummary.summary_content,
              };
            }
          });
          return updated;
        });
      } catch (err) {
        console.error("요약 데이터 로드 실패:", err);
      }
    };

    loadSummaries();
  }, [documentId]);

  const handleSummaryChange = useCallback((slideNumber: number, content: any) => {
    setSummaries(prev =>
      prev.map(s =>
        s.slideNumber === slideNumber
          ? { ...s, summaryContent: content }
          : s
      )
    );

    // 기존 타이머 취소
    if (saveTimeouts.current[slideNumber]) {
      clearTimeout(saveTimeouts.current[slideNumber]);
    }

    // 디바운스된 저장 (1초 후)
    saveTimeouts.current[slideNumber] = setTimeout(async () => {
      setSaving(prev => ({ ...prev, [slideNumber]: true }));
      try {
        await updateSlideSummary(documentId, slideNumber, content);
      } catch (err) {
        console.error("요약 저장 실패:", err);
        alert("요약 저장에 실패했습니다.");
      } finally {
        setSaving(prev => ({ ...prev, [slideNumber]: false }));
        delete saveTimeouts.current[slideNumber];
      }
    }, 1000);
  }, [documentId]);

  const toggleAudio = (slideNumber: number) => {
    setExpandedAudio(prev => prev === slideNumber ? null : slideNumber);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 슬라이드별 요약 목록 - 스크롤 가능 */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="p-4 space-y-3">
          {summaries.map((slide) => (
            <div
              key={slide.slideNumber}
              ref={(el) => (slideRefs.current[slide.slideNumber] = el)}
              className={`
                bg-surface rounded-xl border-2 transition-all cursor-pointer border-border
                ${currentSlide === slide.slideNumber 
                  ? "border-primary bg-primary/10 shadow-md" 
                  : "hover:border-primary/50"
                }
              `}
              onClick={() => onSlideChange(slide.slideNumber)}
            >
              {/* 슬라이드 헤더 */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      currentSlide === slide.slideNumber 
                        ? "bg-primary text-white" 
                        : "bg-background text-gray-400"
                    }`}>
                      <span className="text-xs font-bold">
                        {slide.slideNumber}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-white">
                        {slide.title}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {saving[slide.slideNumber] && (
                      <span className="text-xs text-gray-500">저장 중...</span>
                    )}
                    {currentSlide === slide.slideNumber && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>

              {/* 통합 요약 내용 (AI 요약 + 사용자 편집) */}
              <div className="p-3" onClick={(e) => e.stopPropagation()}>
                <TipTapEditor
                  content={slide.summaryContent}
                  onChange={(content) => handleSummaryChange(slide.slideNumber, content)}
                  placeholder="AI 요약 내용을 수정하거나 추가할 수 있습니다..."
                  editable={true}
                  dark={true}
                />

                {/* 교수님 설명 (음성 구간이 있는 경우) */}
                {slide.audioSegments && slide.audioSegments.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAudio(slide.slideNumber);
                      }}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                    >
                      {expandedAudio === slide.slideNumber ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      교수님 설명
                    </button>

                    {expandedAudio === slide.slideNumber && (
                      <div className="mt-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                        <div className="flex items-start gap-2">
                          <button className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full transition-colors">
                            <Play className="w-3 h-3" />
                          </button>
                          <div className="flex-1">
                            <p className="text-xs text-white leading-relaxed">
                              교수님 음성 구간의 정제된 텍스트가 여기에 표시됩니다.
                            </p>
                            <div className="mt-1 text-xs text-gray-500">
                              <span>00:12:34 - 00:15:22</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
