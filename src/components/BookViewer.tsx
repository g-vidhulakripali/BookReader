import { useEffect, useRef, useState, useMemo } from 'react';
// @ts-ignore
import HTMLFlipBook from 'react-pageflip';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { PDFPage } from './PDFPage';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookmarkPlus, BookmarkCheck, Search, FileText } from 'lucide-react';

interface BookViewerProps {
  pdf: PDFDocumentProxy;
  file: File | null;
  onClose: () => void;
}

export function BookViewer({ pdf, file, onClose }: BookViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flipBookRef = useRef<any>(null);

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [renderZoom, setRenderZoom] = useState(1);

  const storageKey = useMemo(() => `bookreader_${file?.name || 'default'}_state`, [file]);

  // Load initial state
  const initialState = useMemo(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return { page: 0, zoom: 1, bookmarks: [] as number[] };
  }, [storageKey]);

  useEffect(() => {
    if (pdf) {
      setNumPages(pdf.numPages);
      setRenderZoom(initialState.zoom || 1);
      setBookmarks(initialState.bookmarks || []);
      setCurrentPage(initialState.page || 0);
    }
  }, [pdf, initialState]);

  const pagesArray = useMemo(() => {
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages]);

  // Save state on change
  useEffect(() => {
    const s = { page: currentPage, zoom: renderZoom, bookmarks };
    localStorage.setItem(storageKey, JSON.stringify(s));
  }, [currentPage, renderZoom, bookmarks, storageKey]);

  // Keyboard navigation & resize observer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        flipBookRef.current?.pageFlip().flipNext();
      } else if (e.key === 'ArrowLeft') {
        flipBookRef.current?.pageFlip().flipPrev();
      }
    };

    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight
          });
        }
      }, 150);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    
    handleResize(); // Initial measurement

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);
  
  const toggleBookmark = () => {
    setBookmarks(prev => prev.includes(currentPage) ? prev.filter(p => p !== currentPage) : [...prev, currentPage]);
  };

  const isBookmarked = bookmarks.includes(currentPage);
  const handlePageChange = (e: any) => setCurrentPage(e.data);

  // Calculate dynamic book sizes
  const PAGE_ASPECT_RATIO = 0.707;
  const isMobile = dimensions.width < 768;
  
  // Padding around the book so it doesn't touch edges
  const PADDING = isMobile ? 8 : 40; 
  const availableWidth = Math.max(300, dimensions.width - PADDING * 2);
  const availableHeight = Math.max(400, dimensions.height - PADDING * 2);

  let pageWidth: number;
  let pageHeight: number;

  if (isMobile) {
    if (availableWidth / availableHeight < PAGE_ASPECT_RATIO) {
      pageWidth = availableWidth;
      pageHeight = availableWidth / PAGE_ASPECT_RATIO;
    } else {
      pageHeight = availableHeight;
      pageWidth = availableHeight * PAGE_ASPECT_RATIO;
    }
  } else {
    // Force single page even on desktop to match the requested look
    if (availableWidth / availableHeight < PAGE_ASPECT_RATIO) {
      pageWidth = availableWidth;
      pageHeight = pageWidth / PAGE_ASPECT_RATIO;
    } else {
      pageHeight = availableHeight;
      pageWidth = availableHeight * PAGE_ASPECT_RATIO;
    }
  }

  // Ensure reasonable minimums
  pageWidth = Math.max(200, pageWidth);
  pageHeight = Math.max(200 / PAGE_ASPECT_RATIO, pageHeight);

  // Colors from user's requested screenshot
  const headerBg = '#0B1121';
  const mainBg = '#131B2F';
  const controlColor = '#ffffff';

  return (
    <TransformWrapper
      initialScale={initialState.zoom || 1}
      minScale={0.5}
      maxScale={4}
      centerOnInit={true}
      wheel={{ step: 0.1 }}
      onZoomStop={(ref) => setRenderZoom(ref.state.scale)} // Update high-res canvas when zoom stops
    >
      {({ zoomIn, zoomOut }) => (
        <div 
          style={{ 
            width: '100vw', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: headerBg,
            color: controlColor,
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {/* Top App Bar */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '0 1rem',
              height: '64px',
              backgroundColor: headerBg,
              flexShrink: 0,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              zIndex: 10
            }}
          >
            {/* Left Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, overflow: 'hidden' }}>
              <button 
                onClick={onClose}
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '40px', height: '40px', background: 'transparent', border: 'none', 
                  color: controlColor, cursor: 'pointer', flexShrink: 0
                }}
              >
                <ChevronLeft size={24} />
              </button>
              
              <h2 style={{ 
                margin: 0, fontSize: '1.1rem', fontWeight: 600, 
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                fontFamily: 'Outfit, sans-serif'
              }}>
                {file?.name || 'Document'}
              </h2>
            </div>

            {/* Right Section Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
              <button style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: controlColor, cursor: 'pointer' }}>
                <Search size={20} />
              </button>
              
              <span style={{ fontSize: '0.9rem', fontWeight: 500, margin: '0 0.5rem', userSelect: 'none' }}>
                {Math.round(renderZoom * 100)}%
              </span>
              
              <button onClick={() => zoomOut()} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: controlColor, cursor: 'pointer' }}>
                <ZoomOut size={20} />
              </button>
              
              <button onClick={() => zoomIn()} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: controlColor, cursor: 'pointer' }}>
                <ZoomIn size={20} />
              </button>

              <button onClick={toggleBookmark} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: isBookmarked ? '#6366f1' : controlColor, cursor: 'pointer' }}>
                {isBookmarked ? <BookmarkCheck size={20} /> : <BookmarkPlus size={20} />}
              </button>

              <button style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: controlColor, cursor: 'pointer' }}>
                <FileText size={20} />
              </button>
            </div>
          </div>
          
          {/* Scrollable Document Area via react-zoom-pan-pinch */}
          <div 
            ref={containerRef}
            style={{ 
              flex: 1, 
              backgroundColor: mainBg, 
              position: 'relative',
              overflow: 'hidden' // TransformWrapper handles panning, internal overflow must be hidden!
            }}
          >
            <TransformComponent 
              wrapperStyle={{ width: '100%', height: '100%' }} 
              contentStyle={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              {dimensions.width > 0 && numPages > 0 ? (
                <div style={{ 
                  width: `${pageWidth}px`, 
                  height: `${pageHeight}px`,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  backgroundColor: '#fff' 
                }}>
                  {/* @ts-ignore */}
                  <HTMLFlipBook 
                    width={pageWidth} 
                    height={pageHeight} 
                    size="fixed" 
                    minWidth={pageWidth} 
                    maxWidth={pageWidth} 
                    minHeight={pageHeight} 
                    maxHeight={pageHeight} 
                    drawShadow={true} 
                    showCover={true} 
                    usePortrait={true} // Single page mode
                    startPage={initialState.page}
                    autoSize={false} 
                    maxShadowOpacity={0.5} 
                    showPageCorners={false} 
                    onFlip={handlePageChange}
                    useMouseEvents={false} // Disables swipe to flip: allows user to freely pan document!
                    ref={flipBookRef}
                    className="html-flip-book"
                  >
                    {pagesArray.map((pageNum) => (
                      <PDFPage 
                        key={pageNum} 
                        pdf={pdf} 
                        pageNumber={pageNum} 
                        width={pageWidth} 
                        height={pageHeight} 
                        zoom={renderZoom} // Passed to re-render crisp canvas when zoomed
                      />
                    ))}
                  </HTMLFlipBook>
                </div>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  Loading reader...
                </div>
              )}
            </TransformComponent>
          </div>
          
          {/* Bottom Navigation Bar */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '64px',
              backgroundColor: headerBg,
              flexShrink: 0,
              borderTop: '1px solid rgba(255,255,255,0.05)',
              gap: '2rem',
              zIndex: 10
            }}
          >
            <button 
              onClick={() => flipBookRef.current?.pageFlip().flipPrev()} 
              disabled={currentPage === 0}
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', height: '40px', background: 'transparent', border: 'none', 
                color: currentPage === 0 ? 'rgba(255,255,255,0.2)' : controlColor, 
                cursor: currentPage === 0 ? 'default' : 'pointer'
              }}
              title="Previous Page"
            >
              <ChevronLeft size={24} />
            </button>

            <span style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', width: '80px', textAlign: 'center', letterSpacing: '0.05em' }}>
              {currentPage + 1} / {numPages}
            </span>

            <button 
              onClick={() => flipBookRef.current?.pageFlip().flipNext()} 
              disabled={currentPage === numPages - 1}
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', height: '40px', background: 'transparent', border: 'none', 
                color: currentPage === numPages - 1 ? 'rgba(255,255,255,0.2)' : controlColor, 
                cursor: currentPage === numPages - 1 ? 'default' : 'pointer'
              }}
              title="Next Page"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}
    </TransformWrapper>
  );
}
