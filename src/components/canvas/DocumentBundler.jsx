import { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Download, FileUp, GripVertical, Loader2, Trash2, XCircle } from 'lucide-react';

export default function DocumentBundler() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setDownloadUrl(null);
  };

  const handleSort = () => {
    const _files = [...files];
    const draggedItemContent = _files.splice(dragItem.current, 1)[0];
    _files.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setFiles(_files);
    setDownloadUrl(null); // invalidate previous build
  };

  const processAndStamp = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setDownloadUrl(null);

    try {
      const mergedPdf = await PDFDocument.create();
      const helveticaFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
      
      let globalPageCount = 1;

      for (let file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
          const { width, _height } = page.getSize();
          
          // Apply Bates Stamp at Bottom Right corner
          const stampText = `NEMO-EX-${globalPageCount.toString().padStart(4, '0')}`;
          page.drawText(stampText, {
            x: width - 120, // margin right
            y: 20,          // margin bottom
            size: 12,
            font: helveticaFont,
            color: rgb(0.8, 0.1, 0.1), // red stamp
          });
          globalPageCount++;
        });
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

    } catch (err) {
      console.error(err);
      setError("Failed to process PDFs. Ensure they are valid/unencrypted PDF files.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: '16px', border: '1px solid var(--db-border)', borderRadius: '8px', background: 'var(--db-card-bg)' }}>
      {/* File Ingestion */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
           <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>1. Add Local PDFs</div>
           <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>Files remain in your browser securely. Never uploaded.</div>
        </div>
        <label className="db-btn db-btn-secondary db-btn-sm" style={{ cursor: 'pointer', gap: '6px' }}>
          <FileUp size={14} /> Upload PDFs
          <input type="file" multiple accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />
        </label>
      </div>

      {files.length > 0 && (
        <>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)', marginBottom: '8px' }}>2. Reorder Sequence</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginBottom: '12px' }}>Drag and drop to structure the final Exhibit Binder.</div>
          
          {/* Drag and Drop Sorter List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {files.map((file, index) => (
              <div 
                key={`${file.name}-${index}`}
                draggable
                onDragStart={(_e) => (dragItem.current = index)}
                onDragEnter={(_e) => (dragOverItem.current = index)}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
                style={{ 
                  display: 'flex', alignItems: 'center', padding: '10px 12px', background: 'var(--db-bg)', 
                  border: '1px solid var(--db-border)', borderRadius: '6px', cursor: 'grab' 
                }}
              >
                <GripVertical size={16} style={{ color: 'var(--db-text-muted)', marginRight: '12px', cursor: 'grab' }} />
                <div style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--db-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--db-text-muted)', marginRight: '16px' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <button 
                  onClick={() => removeFile(index)}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--db-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>3. Execute Collation</div>
               <button 
                 className="db-btn db-btn-primary" 
                 onClick={processAndStamp} 
                 disabled={isProcessing}
               >
                 {isProcessing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }} /> : null}
                 {isProcessing ? 'Nemo is Merging & Stamping...' : 'Collate & Bates Stamp'}
               </button>
             </div>

             {error && (
               <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <XCircle size={14} /> {error}
               </div>
             )}

             {downloadUrl && !isProcessing && (
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(118, 185, 0, 0.1)', border: '1px solid var(--db-nvidia-green)', borderRadius: '6px' }}>
                 <div>
                   <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-nvidia-green)' }}>Bundle Ready!</div>
                   <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '4px' }}>Successfully collated and Bates stamped.</div>
                 </div>
                 <a 
                   href={downloadUrl} 
                   download={`Nemo_Exhibit_Bundle_${new Date().toISOString().slice(0,10)}.pdf`}
                   className="db-btn db-btn-secondary"
                   style={{ border: '1px solid var(--db-nvidia-green)', color: 'var(--db-nvidia-green)', textDecoration: 'none' }}
                 >
                   <Download size={14} style={{ marginRight: '6px' }} /> Download PDF
                 </a>
               </div>
             )}
          </div>
        </>
      )}
    </div>
  );
}
