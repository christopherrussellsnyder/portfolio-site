import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Video, FileText, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
}

interface MediaUploaderProps {
  onUploadComplete?: (urls: string[]) => void;
  onMediaAdded?: () => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string;
}

export function MediaUploader({ 
  onUploadComplete, 
  onMediaAdded,
  maxFiles = 10,
  maxSizeMB = 50,
  acceptedTypes = "image/*,video/*,.pdf,.gif"
}: MediaUploaderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const getFileType = (file: File): 'image' | 'video' | 'document' | 'gif' => {
    if (file.type === 'image/gif') return 'gif';
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const uploadFile = async (file: File, index: number): Promise<string | null> => {
    if (!user) {
      toast.error('Please sign in to upload files');
      return null;
    }

    try {
      // Update progress
      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 10 } : f
      ));

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${user.id}/${timestamp}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('media')
        .upload(fileName, file, { 
          upsert: false,
          cacheControl: '3600'
        });

      if (error) throw error;

      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 70 } : f
      ));

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Get image dimensions if it's an image
      let width: number | undefined;
      let height: number | undefined;
      
      if (file.type.startsWith('image/')) {
        try {
          const dimensions = await getImageDimensions(file);
          width = dimensions.width;
          height = dimensions.height;
        } catch (e) {
          console.warn('Could not get image dimensions:', e);
        }
      }

      // Save to media_library table
      const { error: dbError } = await supabase.from('media_library').insert({
        user_id: user.id,
        filename: sanitizedName,
        original_filename: file.name,
        file_type: getFileType(file),
        mime_type: file.type,
        file_size: file.size,
        storage_url: publicUrl,
        thumbnail_url: file.type.startsWith('image/') ? publicUrl : null,
        width,
        height,
        tags: [],
        times_used: 0,
        avg_engagement_rate: 0,
        total_impressions: 0,
        is_favorite: false
      });

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Don't throw - file is uploaded, just DB entry failed
      }

      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 100, status: 'complete' } : f
      ));

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadingFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'error', error: error.message } : f
      ));
      return null;
    }
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!user) {
      toast.error('Please sign in to upload files');
      return;
    }

    const fileArray = Array.from(files);
    
    // Validate files
    const validFiles = fileArray.filter(file => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${file.name} is too large (max ${maxSizeMB}MB)`);
        return false;
      }
      return true;
    }).slice(0, maxFiles);

    if (validFiles.length === 0) return;

    setUploading(true);
    setUploadingFiles(validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    })));

    const urls: string[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const url = await uploadFile(validFiles[i], i);
      if (url) urls.push(url);
    }

    setUploading(false);

    if (urls.length > 0) {
      toast.success(`${urls.length} file(s) uploaded successfully!`);
      onUploadComplete?.(urls);
      onMediaAdded?.();
    }

    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(f => f.status !== 'complete'));
    }, 2000);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <label 
        className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver 
            ? 'border-primary bg-primary/10' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">
                Drag & drop files here or click to browse
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports: JPG, PNG, GIF, WebP, MP4, MOV, PDF • Max {maxSizeMB}MB per file
              </p>
            </div>
          </div>
        )}
      </label>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((upload, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                {upload.file.type.startsWith('image/') ? (
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                ) : upload.file.type.startsWith('video/') ? (
                  <Video className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={upload.progress} className="flex-1 h-1.5" />
                  <span className="text-xs text-muted-foreground">
                    {upload.status === 'complete' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : upload.status === 'error' ? (
                      <span className="text-destructive">Failed</span>
                    ) : (
                      `${Math.round(upload.progress)}%`
                    )}
                  </span>
                </div>
              </div>
              {upload.status !== 'uploading' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
