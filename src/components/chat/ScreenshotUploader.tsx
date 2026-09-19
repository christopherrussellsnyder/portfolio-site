import React, { useCallback, useState } from 'react';
import { Upload, X, Image, FileText, Loader2, AlertCircle, FileSpreadsheet, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AnalyticsFileType } from '@/hooks/useScreenshotAnalysis';

interface UploadedFile {
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
  fileType: AnalyticsFileType;
}

interface ScreenshotUploaderProps {
  onFileAnalyze: (file: File) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DOC_SIZE = 25 * 1024 * 1024; // 25MB
const ACCEPTED_TYPES: Record<string, AnalyticsFileType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/vnd.ms-excel': 'excel',
};

const ACCEPT_STRING = 'image/png,image/jpg,image/jpeg,image/webp,application/pdf,.xlsx,.xls,.csv';

function detectFileType(file: File): AnalyticsFileType | null {
  if (ACCEPTED_TYPES[file.type]) return ACCEPTED_TYPES[file.type];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'csv') return 'csv';
  if (['xlsx', 'xls'].includes(ext)) return 'excel';
  return null;
}

function getFileIcon(fileType: AnalyticsFileType) {
  switch (fileType) {
    case 'image': return <Image className="w-8 h-8 text-muted-foreground" />;
    case 'pdf': return <FileText className="w-8 h-8 text-destructive" />;
    case 'csv': return <FileSpreadsheet className="w-8 h-8 text-primary" />;
    case 'excel': return <FileSpreadsheet className="w-8 h-8 text-primary" />;
  }
}

function getFileTypeBadge(fileType: AnalyticsFileType) {
  switch (fileType) {
    case 'image': return '📸 Image';
    case 'pdf': return '📄 PDF';
    case 'csv': return '📊 CSV';
    case 'excel': return '📊 Excel';
  }
}

function getProcessingMessage(fileType: AnalyticsFileType, isAnalyzing: boolean) {
  if (!isAnalyzing) return 'Uploading...';
  switch (fileType) {
    case 'image': return 'Reading image with AI...';
    case 'pdf': return 'Analyzing PDF document...';
    case 'csv': return 'Processing spreadsheet data...';
    case 'excel': return 'Processing Excel data...';
  }
}

export function ScreenshotUploader({ 
  onFileAnalyze, 
  disabled = false,
  className 
}: ScreenshotUploaderProps) {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const validateFile = (file: File): { error: string | null; fileType: AnalyticsFileType | null } => {
    const fileType = detectFileType(file);
    if (!fileType) {
      return { error: 'Please upload PNG, JPG, JPEG, PDF, Excel, or CSV files', fileType: null };
    }
    const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
    const maxLabel = fileType === 'image' ? '10MB' : '25MB';
    if (file.size > maxSize) {
      return { error: `File size exceeds ${maxLabel} limit`, fileType };
    }
    return { error: null, fileType };
  };

  const handleFile = useCallback((file: File) => {
    const { error, fileType } = validateFile(file);
    if (error || !fileType) {
      setUploadedFile({
        file,
        preview: '',
        progress: 0,
        status: 'error',
        error: error || 'Unsupported file type',
        fileType: fileType || 'image',
      });
      return;
    }

    const preview = fileType === 'image' ? URL.createObjectURL(file) : '';
    setUploadedFile({
      file,
      preview,
      progress: 0,
      status: 'pending',
      fileType,
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const removeFile = useCallback(() => {
    if (uploadedFile?.preview) URL.revokeObjectURL(uploadedFile.preview);
    setUploadedFile(null);
  }, [uploadedFile]);

  const handleUploadAndAnalyze = async () => {
    if (!uploadedFile || uploadedFile.status !== 'pending') return;

    try {
      setUploadedFile(prev => prev ? { ...prev, status: 'uploading', progress: 10 } : null);
      
      const progressInterval = setInterval(() => {
        setUploadedFile(prev => {
          if (prev && prev.progress < 50) return { ...prev, progress: prev.progress + 10 };
          return prev;
        });
      }, 200);

      setIsAnalyzing(true);
      setUploadedFile(prev => prev ? { ...prev, progress: 30 } : null);
      
      await onFileAnalyze(uploadedFile.file);
      
      clearInterval(progressInterval);
      setUploadedFile(prev => prev ? { ...prev, status: 'complete', progress: 100 } : null);
      
      setTimeout(() => removeFile(), 1000);
    } catch (error) {
      console.error('Upload/analyze error:', error);
      setUploadedFile(prev => prev ? { 
        ...prev, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Processing failed'
      } : null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {!uploadedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer',
            'hover:border-primary/50 hover:bg-primary/5',
            isDragging && 'border-primary bg-primary/10',
            disabled && 'opacity-50 cursor-not-allowed',
            'border-muted-foreground/25'
          )}
        >
          <input
            type="file"
            accept={ACCEPT_STRING}
            onChange={handleInputChange}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-3 rounded-full bg-primary/10">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Drop analytics file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                📸 Images (10MB) · 📄 PDF · 📊 Excel/CSV (25MB)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-start gap-3">
            {/* Preview */}
            <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
              {uploadedFile.fileType === 'image' && uploadedFile.preview ? (
                <img src={uploadedFile.preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                getFileIcon(uploadedFile.fileType)
              )}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">
                  {getFileTypeBadge(uploadedFile.fileType)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.file.size)}</p>
              
              {uploadedFile.status === 'error' && (
                <div className="flex items-center gap-1 mt-1 text-destructive">
                  <AlertCircle className="w-3 h-3" />
                  <p className="text-xs">{uploadedFile.error}</p>
                </div>
              )}

              {(uploadedFile.status === 'uploading') && (
                <div className="mt-2 space-y-1">
                  <Progress value={uploadedFile.progress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {getProcessingMessage(uploadedFile.fileType, isAnalyzing)}
                  </p>
                </div>
              )}
            </div>

            {/* Remove button */}
            {uploadedFile.status !== 'uploading' && !isAnalyzing && (
              <Button aria-label="Remove file" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={removeFile}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Action buttons */}
          {uploadedFile.status === 'pending' && (
            <div className="flex gap-2 mt-3">
              <Button onClick={handleUploadAndAnalyze} disabled={disabled} className="flex-1" size="sm">
                {uploadedFile.fileType === 'image' ? <Image className="w-4 h-4 mr-2" /> :
                 uploadedFile.fileType === 'pdf' ? <FileText className="w-4 h-4 mr-2" /> :
                 <FileSpreadsheet className="w-4 h-4 mr-2" />}
                Analyze {getFileTypeBadge(uploadedFile.fileType).split(' ')[1]}
              </Button>
            </div>
          )}

          {(uploadedFile.status === 'uploading' || isAnalyzing) && (
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{getProcessingMessage(uploadedFile.fileType, isAnalyzing)}</span>
            </div>
          )}

          {uploadedFile.status === 'error' && (
            <Button
              onClick={() => setUploadedFile(prev => prev ? { ...prev, status: 'pending', error: undefined } : null)}
              variant="outline"
              size="sm"
              className="w-full mt-3"
            >
              Try Again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
