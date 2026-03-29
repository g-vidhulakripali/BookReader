import React, { useRef, useEffect, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';

interface HighlightData {
  id?: string;
  rects: { x: number; y: number; width: number; height: number }[];
  color?: string;
  text?: string;
}

interface PDFPageProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  height: number;
  zoom?: number;
  shouldRender: boolean;
  isHighlightMode?: boolean;
  highlights?: HighlightData[];
  onHighlight?: (rects: any[], text: string) => void;
}

export const PDFPage = React.forwardRef<HTMLDivElement, PDFPageProps>(
  ({ pdf, pageNumber, width, height, zoom = 1, shouldRender, isHighlightMode = false, highlights = [], onHighlight }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      let isCancelled = false;
      let renderTask: any = null;

      const renderPage = async () => {
        if (!shouldRender || !canvasRef.current || !textLayerRef.current || !pdf) return;
        
        try {
          const page = await pdf.getPage(pageNumber);
          if (isCancelled) return;
          
          const viewportInfo = page.getViewport({ scale: 1.0 });
          // Scale to fit our predefined page size while maintaining aspect ratio
          const scale = Math.min(width / viewportInfo.width, height / viewportInfo.height);
          
          // CSS Viewport for the TextLayer (logical size)
          const cssViewport = page.getViewport({ scale: scale });
          
          // High-Res Viewport for Canvas rendering
          const pixelRatio = (window.devicePixelRatio || 2) * zoom;
          const renderViewport = page.getViewport({ scale: scale * pixelRatio }); 
          
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          
          if (!context) return;
          
          canvas.height = renderViewport.height;
          canvas.width = renderViewport.width;
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.objectFit = 'contain';
          
          const renderContext = {
            canvasContext: context,
            viewport: renderViewport,
            canvas: canvas,
          };
          
          renderTask = page.render(renderContext);
          await renderTask.promise;

          if (isCancelled) return;

          // Render Text Layer
          const textContent = await page.getTextContent();
          if (isCancelled) return;

          const textLayerDiv = textLayerRef.current;
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.setProperty('--scale-factor', cssViewport.scale.toString());
          
          await (pdfjsLib as any).renderTextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: cssViewport,
            textDivs: []
          }).promise;

        } catch (error) {
          if ((error as any).name !== 'RenderingCancelledException') {
            console.error(`Error rendering page ${pageNumber}:`, error);
          }
        }
      };

      // Clear the canvas explicitly if component is unloaded off-screen to save RAM
      if (!shouldRender && canvasRef.current) {
         const ctx = canvasRef.current.getContext('2d');
         if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
         if (textLayerRef.current) textLayerRef.current.innerHTML = '';
      }

      renderPage();

      return () => {
        isCancelled = true;
        if (renderTask) {
          renderTask.cancel();
        }
      };
    }, [pdf, pageNumber, width, height, zoom, shouldRender]);

    const [isDrawingHighlight, setIsDrawingHighlight] = useState(false);
    const [draftRect, setDraftRect] = useState<{x:number, y:number, width:number, height:number} | null>(null);
    const startPointRef = useRef<{x:number, y:number} | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
      if (!isHighlightMode) return;
      e.preventDefault();
      e.stopPropagation(); // CRITICAL: Stop HTMLFlipBook from absorbing the drag
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      startPointRef.current = { x, y };
      setIsDrawingHighlight(true);
      setDraftRect({ x, y, width: 0, height: 0 });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!isHighlightMode || !isDrawingHighlight || !startPointRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const startX = startPointRef.current.x;
      const startY = startPointRef.current.y;

      setDraftRect({
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY)
      });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      if (!isHighlightMode || !isDrawingHighlight || !draftRect) return;
      
      setIsDrawingHighlight(false);
      startPointRef.current = null;
      
      const container = containerRef.current;
      if (!container) return;

      if (draftRect.width < 5 || draftRect.height < 5) {
        setDraftRect(null); // Ignore tiny accidental clicks
        return;
      }

      // Convert to percentages for true responsive scaling across screens
      const normalizedRect = {
        x: (draftRect.x / container.clientWidth) * 100,
        y: (draftRect.y / container.clientHeight) * 100,
        width: (draftRect.width / container.clientWidth) * 100,
        height: (draftRect.height / container.clientHeight) * 100
      };

      if (onHighlight) {
        onHighlight([normalizedRect], "Manual Highlight");
      }

      setDraftRect(null);
    };

    return (
      <div 
        ref={(node) => {
          // Both internal containerRef and external forwardRef need attachment
          // @ts-ignore
          containerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }} 
        className="page pdf-page" 
        style={{ 
          width, height, backgroundColor: '#ffffff', overflow: 'hidden', position: 'relative',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)',
          cursor: isHighlightMode ? 'crosshair' : 'default',
          // Force touch-action none to prevent browser interference when drawing highlights on mobile
          touchAction: isHighlightMode ? 'none' : 'auto'
        }}
        onPointerDownCapture={handlePointerDown}
        onPointerMoveCapture={handlePointerMove}
        onPointerUpCapture={handlePointerUp}
        onPointerCancelCapture={() => { setIsDrawingHighlight(false); setDraftRect(null); }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <canvas ref={canvasRef} />
        </div>
        
        {/* Text Layer Container */}
        <div 
          ref={textLayerRef} 
          className="textLayer" 
          style={{ 
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            overflow: 'hidden', opacity: 1, lineHeight: 1.0, zIndex: 5,
            userSelect: 'text', WebkitUserSelect: 'text', color: 'transparent'
          }} 
        />
        
        <div className="page-number" style={{ 
          position: 'absolute', bottom: '15px', 
          right: pageNumber % 2 === 0 ? '15px' : 'auto', 
          left: pageNumber % 2 !== 0 ? '15px' : 'auto', 
          fontSize: '11px', color: '#999', fontFamily: 'Inter', zIndex: 10
        }}>
          {pageNumber}
        </div>

        {/* Existing Highlights */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4, mixBlendMode: 'multiply' }}>
          {highlights.map(h => (
            <React.Fragment key={h.id}>
              {h.rects.map((rect: any, i: number) => (
                <div 
                  key={i}
                  style={{ 
                    position: 'absolute', 
                    left: `${rect.x}%`, 
                    top: `${rect.y}%`, 
                    width: `${rect.width}%`, 
                    height: `${rect.height}%`, 
                    backgroundColor: h.color || 'rgba(255, 235, 59, 0.4)' 
                  }} 
                />
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* Live Draft Highlight */}
        {draftRect && (
          <div style={{
            position: 'absolute',
            left: `${draftRect.x}px`,
            top: `${draftRect.y}px`,
            width: `${draftRect.width}px`,
            height: `${draftRect.height}px`,
            backgroundColor: 'rgba(255, 235, 59, 0.5)',
            border: '2px solid rgba(255, 235, 59, 0.8)',
            pointerEvents: 'none', zIndex: 6
          }} />
        )}

      </div>
    );
  }
);
