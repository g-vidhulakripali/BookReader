import { useEffect, useRef, useState, useMemo } from 'react';
// @ts-ignore
import HTMLFlipBook from 'react-pageflip';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { PDFPage } from './PDFPage';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookmarkPlus, BookmarkCheck, List, X, Menu } from 'lucide-react';

interface BookViewerProps {
  pdf: PDFDocumentProxy;
  file: File | null;
}

export function BookViewer({ pdf, file }: BookViewerProps) {
  const flipBookRef = useRef<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const baseWidth = isMobile ? 400 : 800; // HTMLFlipBook uses 400px per page. 800 is a 2-page spread, 400 is 1 page.
  const paddingOffset = isMobile ? 32 : 64;
  const layoutScale = Math.min(1, (windowWidth - paddingOffset) / baseWidth);
  const finalScale = zoomLevel * layoutScale;

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
      setZoomLevel(initialState.zoom);
      setBookmarks(initialState.bookmarks || []);
      setCurrentPage(initialState.page || 0);
    }
  }, [pdf, initialState]);

  const pagesArray = useMemo(() => {
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages]);

  // Save state on change
  useEffect(() => {
    const s = {
      page: currentPage,
      zoom: zoomLevel,
      bookmarks: bookmarks
    };
    localStorage.setItem(storageKey, JSON.stringify(s));
  }, [currentPage, zoomLevel, bookmarks, storageKey]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        flipBookRef.current?.pageFlip().flipNext();
      } else if (e.key === 'ArrowLeft') {
        flipBookRef.current?.pageFlip().flipPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleZoomIn = () => setZoomLevel(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(z => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const toggleBookmark = () => {
    setBookmarks(prev => {
      if (prev.includes(currentPage)) {
        return prev.filter(p => p !== currentPage);
      } else {
        return [...prev, currentPage];
      }
    });
  };

  const isBookmarked = bookmarks.includes(currentPage);
  
  const handlePageChange = (e: any) => {
    setCurrentPage(e.data);
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ width: '100%', height: 'calc(100vh - 100px)', maxWidth: '1500px', display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
      <div className="book-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'Outfit', fontSize: isMobile ? '1.1rem' : '1.25rem', wordBreak: 'break-all', textAlign: 'left' }}>{file?.name || 'Document'}</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'block', textAlign: 'left' }}>
              Page {currentPage + 1} of {numPages}
            </span>
          </div>
          
          {isMobile && (
            <button className="glass-pill flex-center" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ padding: '0.5rem', width: '40px', height: '40px' }} aria-label="Menu">
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
        
        {(!isMobile || isMobileMenuOpen) && (
        <div className="flex-center toolbar-actions animate-fade-in" style={{ gap: '0.5rem', width: isMobile ? '100%' : 'auto', marginTop: isMobile ? '0.5rem' : 0 }}>
          <button className="glass-pill flex-center" style={{ padding: '0.5rem', width: '38px', height: '38px', transition: 'all 0.2s' }} onClick={() => flipBookRef.current?.pageFlip().flipPrev()} title="Previous Page (Left Arrow)">
            <ChevronLeft size={22} />
          </button>
          <button className="glass-pill flex-center" style={{ padding: '0.5rem', width: '38px', height: '38px', transition: 'all 0.2s' }} onClick={() => flipBookRef.current?.pageFlip().flipNext()} title="Next Page (Right Arrow)">
            <ChevronRight size={22} />
          </button>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 0.5rem' }}></div>
          
          <button className="glass-pill flex-center" style={{ padding: '0.5rem', width: '38px', height: '38px', transition: 'all 0.2s' }} onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut size={18} />
          </button>
          <button className="glass-pill flex-center" style={{ padding: '0.5rem', minWidth: '55px', fontSize: '0.8rem', fontWeight: 600 }} onClick={handleResetZoom} title="Reset Zoom">
            {Math.round(zoomLevel * 100)}%
          </button>
          <button className="glass-pill flex-center" style={{ padding: '0.5rem', width: '38px', height: '38px', transition: 'all 0.2s' }} onClick={handleZoomIn} title="Zoom In">
            <ZoomIn size={18} />
          </button>

          <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 0.5rem' }}></div>

          <button className="glass-pill flex-center" style={{ padding: '0.5rem', width: '38px', height: '38px', color: isBookmarked ? 'var(--accent-color)' : 'inherit', background: isBookmarked ? 'rgba(99, 102, 241, 0.1)' : 'var(--glass-bg)', transition: 'all 0.2s' }} onClick={toggleBookmark} title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}>
            {isBookmarked ? <BookmarkCheck size={18} /> : <BookmarkPlus size={18} />}
          </button>

          <div style={{ position: 'relative' }}>
            <button className="glass-pill flex-center" style={{ padding: '0.5rem', width: '38px', height: '38px', transition: 'all 0.2s' }} onClick={() => setShowBookmarks(!showBookmarks)} title="Saved Bookmarks">
              <List size={18} />
            </button>
            
            {showBookmarks && (
              <div className="glass-panel" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', padding: '1rem', minWidth: '180px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Saved Bookmarks</h4>
                {bookmarks.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No bookmarks added yet.</p>
                ) : (
                  bookmarks.sort((a,b)=>a-b).map(b => (
                    <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button style={{ flex: 1, padding: '0.6rem 1rem', textAlign: 'left', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s' }} 
                        onMouseOver={e => e.currentTarget.style.background = 'var(--selection-bg)'}
                        onMouseOut={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                        onClick={() => { flipBookRef.current?.pageFlip().turnToPage(b); setShowBookmarks(false); }}>
                        Jump to Page {b + 1}
                      </button>
                      <button 
                        style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBookmarks(prev => prev.filter(p => p !== b));
                        }}
                        title="Remove Bookmark"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
      
      <div style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'auto', padding: isMobile ? '0.5rem' : '1rem', borderRadius: '12px' }}>
        
        {/* Left Flip Button (Floating on Mobile) */}
        <button 
           className="glass-pill flex-center hover-scale" 
           style={isMobile ? {
             width: '32px', height: '32px', zIndex: 100, opacity: 0.5,
             background: 'var(--glass-bg)', border: 'none', boxShadow: 'none',
             cursor: 'pointer', position: 'fixed', left: '0.5rem', top: '50%', transform: 'translateY(-50%)'
           } : {
             width: '60px', height: '60px', zIndex: 10, flexShrink: 0, 
             background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px var(--book-shadow)',
             cursor: 'pointer', position: 'sticky', left: '0.5rem', top: 'calc(50% - 30px)' 
           }}
           onClick={() => flipBookRef.current?.pageFlip().flipPrev()} 
           title="Previous Page"
        >
           <ChevronLeft size={isMobile ? 24 : 32} />
        </button>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: 'min-content', minWidth: 'min-content', padding: isMobile ? '0.5rem 0 3rem 0' : '2rem 0' }}>
          {/* Spacer Wrapper - forces scrollbars based on zoom level visually changing physical dimensions */}
          <div style={{ width: `${baseWidth * finalScale}px`, height: `${600 * finalScale}px`, transition: 'width 0.3s, height 0.3s', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            
            {/* The Transformer - applies GPU scale but its physical size remains exact for the book */}
            <div style={{ width: `${baseWidth}px`, height: '600px', transform: `scale(${finalScale})`, transformOrigin: 'top center', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
              {numPages > 0 ? (
                // @ts-ignore
                <HTMLFlipBook 
                  width={400} 
                  height={600} 
                  size="fixed" 
                  minWidth={400} 
                  maxWidth={400} 
                  minHeight={600} 
                  maxHeight={600} 
                  drawShadow={true} 
                  showCover={true} 
                  usePortrait={true} 
                  startPage={initialState.page}
                  autoSize={false} 
                  maxShadowOpacity={0.5} 
                  showPageCorners={true}
                  mobileScrollSupport={true}
                  swipeDistance={30}
                  onFlip={handlePageChange}
                  ref={flipBookRef}
                  className="html-flip-book"
                  style={{ margin: '0 auto', touchAction: 'pan-y' }}
                >
                  {pagesArray.map((pageNum) => (
                    <PDFPage 
                      key={pageNum} 
                      pdf={pdf} 
                      pageNumber={pageNum} 
                      width={400} 
                      height={600} 
                      zoom={zoomLevel}
                    />
                  ))}
                </HTMLFlipBook>
              ) : (
                <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>Preparing book mechanics...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Flip Button (Floating on Mobile) */}
        <button 
           className="glass-pill flex-center hover-scale" 
           style={isMobile ? {
             width: '32px', height: '32px', zIndex: 100, opacity: 0.5,
             background: 'var(--glass-bg)', border: 'none', boxShadow: 'none',
             cursor: 'pointer', position: 'fixed', right: '0.5rem', top: '50%', transform: 'translateY(-50%)'
           } : {
             width: '60px', height: '60px', zIndex: 10, flexShrink: 0, 
             background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px var(--book-shadow)',
             cursor: 'pointer', position: 'sticky', right: '0.5rem', top: 'calc(50% - 30px)' 
           }}
           onClick={() => flipBookRef.current?.pageFlip().flipNext()} 
           title="Next Page"
        >
           <ChevronRight size={isMobile ? 24 : 32} />
        </button>

      </div>
    </div>
  );
}
