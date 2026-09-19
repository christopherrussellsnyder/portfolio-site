import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type AnalyticsFileType = 'image' | 'pdf' | 'csv' | 'excel';

interface AnalysisResult {
  success: boolean;
  analysis: string;
  extractedData: any;
  analyticsId?: string;
}

function detectFileType(file: File): AnalyticsFileType {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext) || file.type.startsWith('image/')) return 'image';
  if (ext === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (ext === 'csv' || file.type === 'text/csv') return 'csv';
  if (['xlsx', 'xls'].includes(ext) || file.type.includes('spreadsheet') || file.type.includes('excel')) return 'excel';
  return 'image'; // fallback
}

function parseCSV(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.slice(0, 500); // limit rows
        const headers = results.meta.fields || [];
        let text = `CSV Data (${results.data.length} rows, ${headers.length} columns)\n\n`;
        text += `Columns: ${headers.join(', ')}\n\n`;
        text += `Sample Data (first ${Math.min(rows.length, 50)} rows):\n`;
        rows.slice(0, 50).forEach((row: any, i: number) => {
          text += `Row ${i + 1}: ${JSON.stringify(row)}\n`;
        });
        if (results.data.length > 50) {
          text += `\n... and ${results.data.length - 50} more rows`;
        }
        resolve(text);
      },
      error: (err) => reject(new Error(`CSV parsing failed: ${err.message}`)),
    });
  });
}

function parseExcel(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        let text = `Excel File: ${file.name}\n`;
        text += `Sheets: ${workbook.SheetNames.join(', ')}\n\n`;

        workbook.SheetNames.slice(0, 3).forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          text += `--- Sheet: ${sheetName} (${json.length} rows) ---\n`;
          const headers = json[0] || [];
          text += `Columns: ${headers.join(', ')}\n`;
          json.slice(0, 50).forEach((row, i) => {
            text += `Row ${i + 1}: ${row.join(' | ')}\n`;
          });
          if (json.length > 50) {
            text += `... and ${json.length - 50} more rows\n`;
          }
          text += '\n';
        });
        resolve(text);
      } catch (err) {
        reject(new Error('Could not read spreadsheet. Please ensure it\'s a valid Excel file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function useScreenshotAnalysis() {
  const { activeWorkspaceId } = useWorkspace();
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const uploadScreenshot = useCallback(async (file: File): Promise<string> => {
    setIsUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to upload files');
      }

      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${timestamp}_${sanitizedFilename}`;

      const { data, error } = await supabase.storage
        .from('analytics-screenshots')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error('Failed to upload file');
      }

      // Bucket is private — a public URL would 403. Use a signed URL instead.
      const { data: signed, error: signedError } = await supabase.storage
        .from('analytics-screenshots')
        .createSignedUrl(data.path, 60 * 60 * 24 * 365);

      if (signedError || !signed?.signedUrl) {
        console.error('Signed URL error:', signedError);
        throw new Error('Failed to prepare the uploaded file');
      }

      return signed.signedUrl;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const analyzeScreenshot = useCallback(async (imageUrl: string): Promise<AnalysisResult> => {
    setIsAnalyzing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to analyze files');
      }

      const { data, error } = await supabase.functions.invoke('analyze-screenshot', {
        body: { imageUrl, userId: user.id, workspace_id: activeWorkspaceId },
      });

      if (error) {
        console.error('Analysis error:', error);
        throw new Error(error.message || 'Failed to analyze file');
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      return data;
    } finally {
      setIsAnalyzing(false);
    }
  }, [activeWorkspaceId]);

  const analyzeFile = useCallback(async (file: File): Promise<AnalysisResult | null> => {
    const fileType = detectFileType(file);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in');

      if (fileType === 'image') {
        // Existing flow: upload then analyze via vision
        const imageUrl = await uploadScreenshot(file);
        const result = await analyzeScreenshot(imageUrl);
        toast({ title: 'Analysis Complete', description: 'Your analytics image has been analyzed successfully.' });
        return result;
      }

      if (fileType === 'pdf') {
        // Upload PDF, then send base64 to edge function for Gemini document analysis
        setIsUploading(true);
        const imageUrl = await uploadScreenshot(file);
        setIsUploading(false);

        setIsAnalyzing(true);
        try {
          const base64 = await fileToBase64(file);
          const { data, error } = await supabase.functions.invoke('analyze-screenshot', {
            body: {
              imageBase64: base64,
              userId: user.id,
              workspace_id: activeWorkspaceId,
              screenshotUrl: imageUrl,
              contentType: 'application/pdf',
              fileType: 'pdf',
            },
          });
          if (error) throw new Error(error.message || 'PDF analysis failed');
          if (!data.success) throw new Error(data.error || 'PDF analysis failed');
          toast({ title: 'Analysis Complete', description: 'Your PDF has been analyzed successfully.' });
          return data;
        } finally {
          setIsAnalyzing(false);
        }
      }

      if (fileType === 'csv' || fileType === 'excel') {
        // Parse client-side, send text data to edge function
        setIsAnalyzing(true);
        try {
          const parsedText = fileType === 'csv' ? await parseCSV(file) : await parseExcel(file);
          
          const { data, error } = await supabase.functions.invoke('analyze-screenshot', {
            body: {
              textData: parsedText,
              userId: user.id,
              workspace_id: activeWorkspaceId,
              fileType,
              fileName: file.name,
            },
          });
          if (error) throw new Error(error.message || 'Spreadsheet analysis failed');
          if (!data.success) throw new Error(data.error || 'Analysis failed');
          toast({ title: 'Analysis Complete', description: 'Your spreadsheet data has been analyzed successfully.' });
          return data;
        } finally {
          setIsAnalyzing(false);
        }
      }

      throw new Error('Unsupported file type');
    } catch (error) {
      console.error('File analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      return null;
    }
  }, [uploadScreenshot, analyzeScreenshot, activeWorkspaceId]);

  // Keep legacy method for backward compat
  const uploadAndAnalyze = useCallback(async (file: File): Promise<AnalysisResult | null> => {
    return analyzeFile(file);
  }, [analyzeFile]);

  return {
    uploadScreenshot,
    analyzeScreenshot,
    analyzeFile,
    uploadAndAnalyze,
    isUploading,
    isAnalyzing,
    isProcessing: isUploading || isAnalyzing,
    detectFileType,
  };
}
