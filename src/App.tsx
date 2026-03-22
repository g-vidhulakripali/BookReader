import { useState, useEffect } from 'react';
import { BookOpen, Moon, Sun } from 'lucide-react';
import { PDFUploader } from './components/PDFUploader';
import { BookViewer } from './components/BookViewer';
import type { PDFDocumentProxy } from 'pdfjs-dist';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handlePDFLoaded = (pdf: PDFDocumentProxy, file: File) => {
    setPdfDoc(pdf);
    setPdfFile(file);
  };

  return (
    <div className="app-container flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
      <nav className="glass-panel animate-fade-in" style={{ 
        position: 'fixed', top: '1rem', width: '95%', maxWidth: '1200px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '0.6rem 1rem', zIndex: 100 
      }}>
        <div className="brand flex-center" style={{ gap: '0.75rem' }}>
          <BookOpen color="var(--accent-color)" size={28} />
          <span style={{ fontFamily: 'Outfit', fontWeight: 600, fontSize: '1.35rem', letterSpacing: '-0.02em' }}>BookReader</span>
        </div>
        <div className="controls flex-center" style={{ gap: '1rem' }}>
          {pdfDoc && (
            <button className="glass-pill" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }} onClick={() => setPdfDoc(null)}>
              Close
            </button>
          )}
          <button className="glass-pill flex-center" onClick={toggleTheme} style={{ padding: '0.6rem' }} aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      <main className="main-content flex-center animate-fade-in" style={{ flex: 1, width: '100%', padding: '5rem 0.5rem 1rem', animationDelay: '0.1s' }}>
        {!pdfDoc ? (
          <PDFUploader onPDFLoaded={handlePDFLoaded} />
        ) : (
          <BookViewer pdf={pdfDoc} file={pdfFile} />
        )}
      </main>
    </div>
  );
}

export default App;
