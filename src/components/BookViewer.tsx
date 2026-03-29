import { useEffect, useRef, useState } from 'react';
// @ts-ignore
import HTMLFlipBook from 'react-pageflip';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { PDFPage } from './PDFPage';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookmarkPlus, BookmarkCheck, Search, Loader2, List, Highlighter, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface BookViewerProps {
  pdf: PDFDocumentProxy;
  book: { id: string; title: string; file_path: string };
  onClose: () => void;
}

export function BookViewer({ pdf, book, onClose }: BookViewerProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const flipBookRef = useRef<any>(null);

  const [loadingState, setLoadingState] = useState(true);
  
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [initialPage, setInitialPage] = useState<number>(0);
  const [bookmarks, setBookmarks] = useState<{ id: string, page: number }[]>([]);
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [renderZoom, setRenderZoom] = useState(1);

  // Load state from Supabase
  useEffect(() => {
    async function fetchState() {
      if (!user) return;
      try {
        const [progressRes, bookmarksRes, highlightsRes] = await Promise.all([
          supabase.from('user_progress').select('*').eq('book_id', book.id).single(),
          supabase.from('bookmarks').select('*').eq('book_id', book.id).order('page_number', { ascending: true }),
          supabase.from('highlights').select('*').eq('book_id', book.id)
        ]);

        if (progressRes.data) {
          setInitialPage(progressRes.data.current_page || 0);
          setCurrentPage(progressRes.data.current_page || 0);
          setRenderZoom(progressRes.data.zoom_level || 1);
        }

        if (bookmarksRes.data) {
          setBookmarks(bookmarksRes.data.map(b => ({ id: b.id, page: b.page_number })));
        }

        if (highlightsRes.data) {
          setHighlights(highlightsRes.data);
        }
      } catch (err) {
        console.error("Error loading book state:", err);
      } finally {
        setNumPages(pdf.numPages);
        setLoadingState(false);
      }
    }
    fetchState();
  }, [book.id, user, pdf]);

  // Save progress automatically (debounced)
  useEffect(() => {
    if (loadingState || !user) return;
    const saveTimer = setTimeout(async () => {
      await supabase.from('user_progress').upsert({
        user_id: user.id,
        book_id: book.id,
        current_page: currentPage,
        zoom_level: renderZoom,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, book_id' });
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [currentPage, renderZoom, book.id, user, loadingState]);

  const toggleBookmark = async () => {
    if (!user) return;
    const existing = bookmarks.find(b => b.page === currentPage);
    
    try {
      if (existing) {
        // Remove
        setBookmarks(prev => prev.filter(b => b.page !== currentPage));
        await supabase.from('bookmarks').delete().eq('id', existing.id);
      } else {
        // Add
        const { data } = await supabase.from('bookmarks').insert({
          user_id: user.id,
          book_id: book.id,
          page_number: currentPage
        }).select().single();
        
        if (data) {
          setBookmarks(prev => [...prev, { id: data.id, page: data.page_number }].sort((a,b) => a.page - b.page));
        }
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
    }
  };

  const removeBookmarkFromList = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setBookmarks(prev => prev.filter(b => b.id !== id));
    try {
      await supabase.from('bookmarks').delete().eq('id', id);
    } catch (err) {
      console.error("Error deleting bookmark:", err);
    }
  };

  const jumpToPage = (pageIndex: number) => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().turnToPage(pageIndex);
      setCurrentPage(pageIndex);
    }
    setShowBookmarksPanel(false);
  };

  const handleHighlight = async (pageNumber: number, rects: any[], text: string) => {
    if (!user) return;
    const tempHighlight = { id: Math.random().toString(), page_number: pageNumber, rects, text, color: 'rgba(255, 235, 59, 0.4)' };
    setHighlights(prev => [...prev, tempHighlight]);

    try {
      const { data } = await supabase.from('highlights').insert({
        user_id: user.id,
        book_id: book.id,
        page_number: pageNumber,
        text,
        rects,
        color: 'rgba(255, 235, 59, 0.4)'
      }).select().single();
      
      if (data) {
        setHighlights(prev => prev.map(h => h.id === tempHighlight.id ? data : h));
      }
    } catch (err) {
      console.error("Save highlight error:", err);
    }
  };

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
    
    handleResize(); 
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Recalculate dimensions once the cloud sync finishes and the container natively mounts
  useEffect(() => {
    if (!loadingState && containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, [loadingState]);

  const isBookmarked = bookmarks.some(b => b.page === currentPage);
  const handlePageChange = (e: any) => setCurrentPage(e.data);

  // Dynamic book sizes
  const PAGE_ASPECT_RATIO = 0.707;
  const isMobile = dimensions.width < 768;
  const PADDING = isMobile ? 8 : 40; 
  const availableWidth = Math.max(300, dimensions.width - PADDING * 2);
  const availableHeight = Math.max(400, dimensions.height - PADDING * 2);

  let pageWidth = availableWidth;
  let pageHeight = availableHeight;

  if (availableWidth / availableHeight < PAGE_ASPECT_RATIO) {
    pageWidth = availableWidth;
    pageHeight = availableWidth / PAGE_ASPECT_RATIO;
  } else {
    pageHeight = availableHeight;
    pageWidth = availableHeight * PAGE_ASPECT_RATIO;
  }

  pageWidth = Math.max(200, pageWidth);
  pageHeight = Math.max(200 / PAGE_ASPECT_RATIO, pageHeight);

  // Colors
  const headerBg = '#0B1121';
  const mainBg = '#131B2F';
  const controlColor = '#ffffff';

  if (loadingState) {
    return (
      <div style={{ width: '10vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: headerBg, color: '#fff' }}>
        <Loader2 className="animate-spin" size={32} color="#6366f1" />
        <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.6)' }}>Syncing cloud progress...</p>
      </div>
    );
  }

  return (
    <TransformWrapper
      initialScale={renderZoom}
      minScale={0.5}
      maxScale={4}
      centerOnInit={true}
      wheel={{ step: 0.1 }}
      panning={{ disabled: isHighlightMode }}
      onZoomStop={(ref) => setRenderZoom(ref.state.scale)} 
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
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 1rem', height: '64px', backgroundColor: headerBg, flexShrink: 0,
              borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10
            }}
          >
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
              }} title={book.title}>
                {book.title}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0, position: 'relative' }}>
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

              <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 0.25rem' }} />

              <button 
                onClick={() => setIsHighlightMode(!isHighlightMode)} 
                style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isHighlightMode ? 'rgba(99, 102, 241, 0.15)' : 'transparent', border: 'none', color: isHighlightMode ? '#6366f1' : controlColor, cursor: 'pointer', borderRadius: '8px' }}
                title="Toggle Text Highlight Mode"
              >
                <Highlighter size={20} />
              </button>

              <button onClick={toggleBookmark} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: isBookmarked ? '#6366f1' : controlColor, cursor: 'pointer' }} title="Bookmark Current Page">
                {isBookmarked ? <BookmarkCheck size={20} /> : <BookmarkPlus size={20} />}
              </button>

              <button 
                onClick={() => setShowBookmarksPanel(!showBookmarksPanel)}
                style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: showBookmarksPanel ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '8px', border: 'none', color: controlColor, cursor: 'pointer' }}
              >
                <List size={20} />
              </button>

              {/* Bookmarks Dropdown */}
              {showBookmarksPanel && (
                <div style={{
                  position: 'absolute', top: '100%', right: '0', marginTop: '0.5rem',
                  backgroundColor: '#131b2f', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                  width: '240px', maxHeight: '300px', overflowY: 'auto', zIndex: 100
                }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem', fontWeight: 600 }}>
                    Saved Bookmarks
                  </div>
                  {bookmarks.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                      No bookmarks saved yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {bookmarks.map(b => (
                        <div key={b.id} style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <button 
                            onClick={() => jumpToPage(b.page)}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem',
                              padding: '0.75rem 1rem', background: 'transparent', border: 'none',
                              color: b.page === currentPage ? '#6366f1' : '#fff', cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <BookmarkCheck size={16} />
                            <span>Page {b.page + 1}</span>
                          </button>
                          <button 
                            onClick={(e) => removeBookmarkFromList(e, b.id)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              padding: '0 1rem', background: 'transparent', border: 'none',
                              color: 'rgba(239, 68, 68, 0.7)', cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div 
            ref={containerRef}
            style={{ 
              flex: 1, backgroundColor: mainBg, position: 'relative', overflow: 'hidden' 
            }}
          >
            <TransformComponent 
              wrapperStyle={{ width: '100%', height: '100%' }} 
              contentStyle={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              {dimensions.width > 0 && numPages > 0 ? (
                <div style={{ 
                  width: `${pageWidth}px`, height: `${pageHeight}px`,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', backgroundColor: '#fff' 
                }}>
                  {/* @ts-ignore */}
                  <HTMLFlipBook 
                    width={pageWidth} 
                    height={pageHeight}
                    size="fixed"
                    minWidth={300}
                    maxWidth={pageWidth}
                    minHeight={400}
                    maxHeight={pageHeight}
                    showCover={true}
                    usePortrait={true}
                    drawShadow={true}
                    useMouseEvents={false}
                    startPage={initialPage}
                    onFlip={handlePageChange}
                    ref={flipBookRef}
                    className="book-container shadow-2xl"
                  >
                    {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
                      const isPageVisible = Math.abs(pageNum - 1 - currentPage) <= 2;
                      return (
                        <PDFPage 
                          key={pageNum} 
                          pdf={pdf} 
                          pageNumber={pageNum} 
                          width={pageWidth} 
                          height={pageHeight} 
                          zoom={renderZoom} 
                          shouldRender={isPageVisible}
                          isHighlightMode={isHighlightMode}
                          highlights={highlights.filter(h => h.page_number === pageNum)}
                          onHighlight={(rects, text) => handleHighlight(pageNum, rects, text)}
                        />
                      );
                    })}
                  </HTMLFlipBook>
                </div>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  Loading reader layout...
                </div>
              )}
            </TransformComponent>
          </div>
          
          {/* Bottom Navigation */}
          <div 
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '64px', backgroundColor: headerBg, flexShrink: 0,
              borderTop: '1px solid rgba(255,255,255,0.05)', gap: '2rem', zIndex: 10
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
