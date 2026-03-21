# BookReader

A premium, lightweight, fully client-side web application that transforms your PDF documents into an immersive, realistic 3D book-reading experience.

## Features

- **Realistic 3D Page Flipping**: Experience a smooth, physical book-like page flipping animation utilizing the dynamic `react-pageflip` engine.
- **Premium Glassmorphic UI**: Enjoy a stunning, modern aesthetic with dedicated Dark and Light modes.
- **Advanced Dynamic Zoom**: Seamlessly zoom in and out of pages. The application mathematically scales the physical bounds to generate native scrollbars and renders the PDF canvas at an ultra-high pixel density so text remains crystal clear at any zoom level.
- **Persistent Bookmarks**: Drop bookmarks on any page. A dedicated dropdown menu allows you to manage or delete your bookmarks and instantly jump to saved pages.
- **Auto-Restoring State**: The application automatically saves your exact zoom level, your bookmarked pages, and the page you left off on directly to your browser's `localStorage`. Your reading session is instantly restored upon your next visit.
- **Zero Backend**: Fully local processing. Your privacy is guaranteed because no documents are ever uploaded to a server. PDF processing happens entirely within your browser using `pdfjs-dist`.

## Tech Stack

- **React 18** (Vite + TypeScript)
- **pdfjs-dist** (Mozilla's robust PDF renderer)
- **react-pageflip** (HTML5 page flip effects)
- **lucide-react** (Vector iconography)

## Getting Started

1. Clone or download the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the provided `localhost` link in your browser and upload any PDF!
