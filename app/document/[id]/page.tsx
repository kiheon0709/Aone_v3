"use client";

import { useState, use, useEffect } from "react";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import SummaryTabs from "@/components/document/SummaryTabs";
import { fetchFiles, getFileUrl, deleteFile, FileMetadata } from "@/lib/files";
import { getCurrentUser } from "@/lib/auth";
import AuthGuard from "@/components/auth/AuthGuard";
import { 
  fetchSlideSummaries, 
  generateSlideSummaries, 
  SlideSummary 
} from "@/lib/slideSummaries";

// PDFViewer를 Dynamic Import로 로드 (브라우저에서만 실행)
const PDFViewer = dynamic(
  () => import("@/components/document/PDFViewer"),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">PDF 뷰어 로딩 중...</p>
        </div>
      </div>
    )
  }
);

function DocumentContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(1);
  const resolvedParams = use(params);
  const [fileData, setFileData] = useState<FileMetadata | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  
  // 슬라이드 요약 관련 상태
  const [slideSummaries, setSlideSummaries] = useState<SlideSummary[]>([]);
  const [generatingSummaries, setGeneratingSummaries] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    loadDocument();
  }, [resolvedParams.id]);

  // 슬라이드 요약 자동 생성
  useEffect(() => {
    if (fileData && fileData.type === 'pdf') {
      loadOrGenerateSummaries();
    }
  }, [fileData]);

  // 방향키로 슬라이드 이동 (← 이전, → 다음)
  useEffect(() => {
    if (fileData?.type !== 'pdf') return;
    const total = pdfPageCount ?? fileData?.page_count ?? 1;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.max(1, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(total, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileData?.type, fileData?.page_count, pdfPageCount]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();
      if (!user) {
        setError("로그인이 필요합니다.");
        return;
      }

      // 파일 메타데이터 조회
      const files = await fetchFiles(user.id);
      const file = files.find(f => f.id === resolvedParams.id);

      if (!file) {
        setError("문서를 찾을 수 없습니다.");
        return;
      }

      setFileData(file);

      // PDF 파일인 경우 Storage URL 가져오기
      if (file.type === 'pdf') {
        const url = await getFileUrl(file.storage_path);
        setPdfUrl(url);
      }
    } catch (err: any) {
      console.error("문서 로드 실패:", err);
      setError(err.message || "문서를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadOrGenerateSummaries = async () => {
    if (!fileData) return;

    try {
      setSummaryError(null);
      
      // 먼저 기존 요약이 있는지 확인
      const existingSummaries = await fetchSlideSummaries(fileData.id);
      
      if (existingSummaries && existingSummaries.length > 0) {
        console.log('기존 슬라이드 요약 로드:', existingSummaries.length, '개');
        setSlideSummaries(existingSummaries);
      } else {
        // 없으면 자동 생성
        console.log('슬라이드 요약이 없습니다. 자동 생성 시작...');
        setGeneratingSummaries(true);
        
        const newSummaries = await generateSlideSummaries(
          fileData.id,
          fileData.storage_path
        );
        
        console.log('슬라이드 요약 생성 완료:', newSummaries.length, '개');
        setSlideSummaries(newSummaries);
        setGeneratingSummaries(false);
      }
    } catch (err: any) {
      console.error('슬라이드 요약 로드/생성 실패:', err);
      setSummaryError(err.message || '슬라이드 요약 생성에 실패했습니다.');
      setGeneratingSummaries(false);
    }
  };

  const handleDelete = async () => {
    if (!fileData) return;
    
    if (!confirm(`"${fileData.name}" 파일을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteFile(fileData.id);
      router.push("/dashboard");
    } catch (err: any) {
      alert("파일 삭제에 실패했습니다: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">문서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !fileData) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-red-400 mb-6 font-semibold">{error || "문서를 찾을 수 없습니다."}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // PDF에서 읽은 페이지 수를 우선 사용, 없으면 DB의 page_count, 그것도 없으면 1
  const pageCount = pdfPageCount || fileData.page_count || 1;

  // 슬라이드 요약 데이터 매핑
  const mappedSlideSummaries = Array.from({ length: pageCount }, (_, i) => {
    const slideNumber = i + 1;
    const summary = slideSummaries.find(s => s.slide_number === slideNumber);
    
    return {
      slideNumber,
      title: `Slide ${slideNumber}`,
      summaryContent: summary?.summary_content || null,
      userNotesContent: summary?.user_notes_content || null,
      audioSegments: [],
    };
  });

  const documentData = {
    id: fileData.id,
    name: fileData.name,
    pdfUrl: pdfUrl,
    totalSlides: pageCount,
    slideSummaries: mappedSlideSummaries,
    fullSummary: null,
    isGeneratingSummaries: generatingSummaries,
    summaryError: summaryError,
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 헤더 */}
      <header className="h-14 bg-background border-b border-border flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-white" />
          </button>
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-base font-bold text-white tracking-tight">{documentData.name}</h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-gray-500 bg-surface px-3 py-1 rounded-full border border-border">
            {fileData.type === 'pdf' ? `SLIDE ${currentSlide} / ${documentData.totalSlides}` : 'AUDIO'}
          </span>
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-500/10 rounded-xl transition-colors text-red-500"
            title="파일 삭제"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {fileData.type === 'pdf' ? (
          <>
            {/* 좌측: PDF 뷰어 */}
            <div className="w-1/2 bg-surface/30 border-r border-border backdrop-blur-sm">
              {pdfUrl ? (
                <PDFViewer
                  pdfUrl={pdfUrl}
                  currentSlide={currentSlide}
                  totalSlides={documentData.totalSlides}
                  onSlideChange={setCurrentSlide}
                  onPdfLoad={setPdfPageCount}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-500 text-sm font-medium">유효한 URL 생성 중...</p>
                  </div>
                </div>
              )}
            </div>

            {/* 우측: 요약 탭 */}
            <div className="w-1/2 bg-background">
              {generatingSummaries ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-white font-semibold mb-2">
                      AI가 슬라이드를 분석하고 있습니다...
                    </p>
                    <p className="text-sm text-gray-500">
                      잠시만 기다려주세요 (약 30초 ~ 1분 소요)
                    </p>
                  </div>
                </div>
              ) : summaryError ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md px-4">
                    <p className="text-red-600 mb-4">{summaryError}</p>
                    <button
                      onClick={loadOrGenerateSummaries}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              ) : (
                <SummaryTabs
                  documentId={documentData.id}
                  slideSummaries={documentData.slideSummaries}
                  fullSummary={documentData.fullSummary}
                  currentSlide={currentSlide}
                  onSlideChange={setCurrentSlide}
                  storagePath={fileData.storage_path}
                />
              )}
            </div>
          </>
        ) : (
          /* 오디오 파일인 경우 */
          <div className="w-full bg-surface flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400 mb-4">오디오 파일 재생 기능은 준비 중입니다.</p>
              <p className="text-sm text-gray-500">파일명: {fileData.name}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AuthGuard>
      <DocumentContent params={params} />
    </AuthGuard>
  );
}

