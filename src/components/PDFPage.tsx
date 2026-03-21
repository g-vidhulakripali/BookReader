import React, { useRef, useEffect } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface PDFPageProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  height: number;
  zoom?: number;
}

export const PDFPage = React.forwardRef<HTMLDivElement, PDFPageProps>(
  ({ pdf, pageNumber, width, height, zoom = 1 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      let isCancelled = false;
      let renderTask: any = null;

      const renderPage = async () => {
        if (!canvasRef.current || !pdf) return;
        
        try {
          const page = await pdf.getPage(pageNumber);
          if (isCancelled) return;
          
          const viewportInfo = page.getViewport({ scale: 1.0 });
          // Scale to fit our predefined page size while maintaining aspect ratio
          // We render at high resolution to maintain sharpness
          const scale = Math.min(width / viewportInfo.width, height / viewportInfo.height);
          const pixelRatio = (window.devicePixelRatio || 2) * zoom;
          const viewport = page.getViewport({ scale: scale * pixelRatio }); 
          
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          
          if (!context) return;
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.objectFit = 'contain';
          
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          
          renderTask = page.render(renderContext);
          await renderTask.promise;
        } catch (error) {
          // Ignore render cancellation errors as they are expected on unmount or fast turns
          if ((error as any).name !== 'RenderingCancelledException') {
            console.error(`Error rendering page ${pageNumber}:`, error);
          }
        }
      };

      renderPage();

      return () => {
        isCancelled = true;
        if (renderTask) {
          renderTask.cancel();
        }
      };
    }, [pdf, pageNumber, width, height, zoom]);

    // page-flip looks for elements with specific class names
    return (
      <div ref={ref} className="page pdf-page" style={{ 
        width, height, backgroundColor: '#ffffff', overflow: 'hidden', position: 'relative',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <canvas ref={canvasRef} />
        </div>
        
        <div className="page-number" style={{ 
          position: 'absolute', bottom: '15px', 
          right: pageNumber % 2 === 0 ? '15px' : 'auto', 
          left: pageNumber % 2 !== 0 ? '15px' : 'auto', 
          fontSize: '11px', color: '#999', fontFamily: 'Inter' 
        }}>
          {pageNumber}
        </div>
      </div>
    );
  }
);
