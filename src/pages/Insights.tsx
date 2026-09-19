import { DataSourceBadge } from '@/components/DataSourceBadge';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, Upload, ChevronRight, Image, Loader2,
  FileText, Table, FileCode, Code, FileSpreadsheet, File
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { HealthScoreBadge } from '@/components/insights/HealthScoreBadge';
import { AnalysisDetail } from '@/components/insights/AnalysisDetail';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface UploadedAnalytics {
  id: string;
  platform: string;
  platform_confidence?: string | null;
  extracted_data: any;
  ai_insights: any;
  time_period_start: string | null;
  time_period_end: string | null;
  uploaded_at: string;
  image_url: string;
  trend_analysis?: any;
  benchmark_comparison?: any;
  pattern_recognition?: any;
  insights?: any;
  recommendations?: any;
  opportunities?: any;
  risks?: any;
  follow_up_questions?: string[] | null;
  summary?: any;
  overall_health_score?: number;
  performance_rating?: string;
  file_format?: string | null;
  original_filename?: string | null;
  platform_type?: string | null;
}

const ACCEPTED_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
  'application/pdf',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/json',
  'application/xml', 'text/xml'
].join(',');

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_DOC_SIZE = 25 * 1024 * 1024;

function detectFileFormat(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext) || file.type.startsWith('image/')) return 'image';
  if (ext === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (['xls', 'xlsx'].includes(ext) || file.type.includes('spreadsheet') || file.type.includes('excel')) return 'excel';
  if (ext === 'csv' || file.type === 'text/csv') return 'csv';
  if (ext === 'json' || file.type === 'application/json') return 'json';
  if (ext === 'xml' || file.type.includes('xml')) return 'xml';
  return 'unknown';
}

function getFormatBadge(format: string | null | undefined) {
  const configs: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    image: { label: 'Screenshot', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Image className="w-3 h-3" /> },
    pdf: { label: 'PDF', className: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <FileText className="w-3 h-3" /> },
    excel: { label: 'Excel', className: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <Table className="w-3 h-3" /> },
    csv: { label: 'CSV', className: 'bg-teal-500/20 text-teal-400 border-teal-500/30', icon: <FileSpreadsheet className="w-3 h-3" /> },
    json: { label: 'JSON', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <Code className="w-3 h-3" /> },
    xml: { label: 'XML', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <FileCode className="w-3 h-3" /> },
  };
  const cfg = configs[format || ''] || { label: 'File', className: 'bg-muted text-muted-foreground', icon: <File className="w-3 h-3" /> };
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Insights() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const qc = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [selectedUpload, setSelectedUpload] = useState<UploadedAnalytics | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState(0);
  const [uploadFileFormat, setUploadFileFormat] = useState('');

  const uploadsQuery = useQuery({
    queryKey: ['uploaded_analytics', user?.id, activeWorkspaceId],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from('uploaded_analytics')
        .select('*')
        .eq('user_id', user!.id)
        .order('uploaded_at', { ascending: false });
      if (activeWorkspaceId) q = q.eq('workspace_id', activeWorkspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as UploadedAnalytics[];
    },
  });
  const uploads = uploadsQuery.data ?? [];
  const isLoading = uploadsQuery.isLoading;

  useEffect(() => {
    if (uploads.length > 0 && !selectedUpload) setSelectedUpload(uploads[0]);
  }, [uploads, selectedUpload]);

  const loadUploads = async () => {
    await qc.invalidateQueries({ queryKey: ['uploaded_analytics', user?.id, activeWorkspaceId] });
  };


  const parseTextFile = async (file: File, fileFormat: string): Promise<string> => {
    const text = await file.text();
    
    if (fileFormat === 'csv') {
      const result = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
      return JSON.stringify({ headers: result.meta.fields, rows: result.data.slice(0, 500), totalRows: result.data.length }, null, 2);
    }
    
    if (fileFormat === 'excel') {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetsData: Record<string, any> = {};
      for (const name of workbook.SheetNames) {
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: null });
        sheetsData[name] = { rows: json.slice(0, 500), totalRows: json.length };
      }
      return JSON.stringify({ sheets: sheetsData, sheetNames: workbook.SheetNames }, null, 2);
    }
    
    if (fileFormat === 'json') {
      try { JSON.parse(text); return text.slice(0, 50000); }
      catch { return text.slice(0, 50000); }
    }
    
    if (fileFormat === 'xml') {
      return text.slice(0, 50000);
    }
    
    return text.slice(0, 50000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const fileFormat = detectFileFormat(file);
    const maxSize = fileFormat === 'image' ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;

    if (file.size > maxSize) {
      toast.error(`File too large. Max ${fileFormat === 'image' ? '10MB' : '25MB'} for ${fileFormat} files.`);
      return;
    }

    setIsUploading(true);
    setUploadFileName(file.name);
    setUploadFileSize(file.size);
    setUploadFileFormat(fileFormat);
    setUploadProgress('Uploading file...');
    setUploadPercent(10);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('analytics-screenshots')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Bucket is private — a public URL would 403. Use a signed URL instead.
      const { data: signedData } = await supabase.storage
        .from('analytics-screenshots')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);
      const publicUrl = signedData?.signedUrl ?? '';

      setUploadPercent(30);
      setUploadProgress('Processing file...');

      if (fileFormat === 'image' || fileFormat === 'pdf') {
        // Image/PDF: send as base64 for vision analysis
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          setUploadPercent(50);
          setUploadProgress('Analyzing with AI...');

          const { data, error } = await supabase.functions.invoke('analyze-screenshot', {
            body: {
              imageBase64: base64.split(',')[1],
              userId: user.id,
              workspace_id: activeWorkspaceId,
              screenshotUrl: publicUrl,
              fileType: file.type,
              fileFormat,
              fileName: file.name,
              fileSize: file.size,
              contentType: file.type,
            }
          });

          if (error) throw error;
          setUploadPercent(90);
          setUploadProgress('Finalizing...');
          toast.success(`${fileFormat === 'pdf' ? 'PDF' : 'Screenshot'} analyzed successfully!`);
          await loadUploads();
          if (data?.analyticsId) {
            const { data: newUpload } = await supabase
              .from('uploaded_analytics')
              .select('*')
              .eq('id', data.analyticsId)
              .single();
            if (newUpload) setSelectedUpload(newUpload);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // CSV/Excel/JSON/XML: parse on client, send as text data
        setUploadPercent(40);
        setUploadProgress('Extracting data...');
        
        const textData = await parseTextFile(file, fileFormat);
        
        setUploadPercent(60);
        setUploadProgress('Analyzing with AI...');

        const { data, error } = await supabase.functions.invoke('analyze-screenshot', {
          body: {
            textData,
            userId: user.id,
            workspace_id: activeWorkspaceId,
            screenshotUrl: publicUrl,
            fileType: file.type,
            fileFormat,
            fileName: file.name,
            fileSize: file.size,
          }
        });

        if (error) throw error;
        setUploadPercent(90);
        setUploadProgress('Finalizing...');
        toast.success(`${fileFormat.toUpperCase()} file analyzed successfully!`);
        await loadUploads();
        if (data?.analyticsId) {
          const { data: newUpload } = await supabase
            .from('uploaded_analytics')
            .select('*')
            .eq('id', data.analyticsId)
            .single();
          if (newUpload) setSelectedUpload(newUpload);
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const format = fileFormat || 'file';
      toast.error(error.message || `Failed to analyze ${format}. Try re-exporting from the platform or use a different format.`);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      setUploadPercent(0);
      setUploadFileName('');
      setUploadFileSize(0);
      setUploadFileFormat('');
      // Reset file input
      event.target.value = '';
    }
  };

  const getPlatformColor = (platform: string) => {
    const colorMap: Record<string, string> = {
      instagram: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      facebook: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      twitter: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      tiktok: 'bg-slate-500/20 text-slate-200 border-slate-500/30',
      linkedin: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
      google: 'bg-green-500/20 text-green-300 border-green-500/30',
      shopify: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      youtube: 'bg-red-500/20 text-red-300 border-red-500/30',
      pinterest: 'bg-red-400/20 text-red-200 border-red-400/30',
      snapchat: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      microsoft: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      amazon: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    };
    const key = platform?.toLowerCase() || '';
    for (const [k, v] of Object.entries(colorMap)) {
      if (key.includes(k)) return v;
    }
    return 'bg-muted text-foreground border-border';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button aria-label="Go back" variant="ghost" size="icon" onClick={() => navigate('/ai-strategist')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">Insights</h1>
                  <DataSourceBadge type="first_party" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload analytics from any platform — screenshots, PDFs, spreadsheets, and more
                </p>
              </div>

            </div>
            <div>
              <input
                type="file"
                id="analytics-upload"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button 
                onClick={() => document.getElementById('analytics-upload')?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadProgress || 'Analyzing...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Analytics
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="mt-4 p-3 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                {getFormatBadge(uploadFileFormat)}
                <span className="text-sm font-medium truncate flex-1">{uploadFileName}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(uploadFileSize)}</span>
              </div>
              <Progress value={uploadPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{uploadProgress}</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : uploads.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No analytics uploads yet</h2>
            <p className="text-muted-foreground mb-4 max-w-lg mx-auto">
              Upload analytics from any platform in any format. We support screenshots, PDFs, Excel/CSV exports, JSON, and XML data from all major social and advertising platforms.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {['image', 'pdf', 'excel', 'csv', 'json', 'xml'].map(f => (
                <span key={f}>{getFormatBadge(f)}</span>
              ))}
            </div>
            <Button onClick={() => document.getElementById('analytics-upload')?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First Analytics
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Uploads List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Analytics History</h2>
                <Badge variant="outline">{uploads.length} uploads</Badge>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                {uploads.map((upload) => (
                  <Card 
                    key={upload.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedUpload?.id === upload.id ? 'border-primary ring-1 ring-primary/30' : ''
                    }`}
                    onClick={() => setSelectedUpload(upload)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {upload.overall_health_score ? (
                            <HealthScoreBadge score={upload.overall_health_score} size="sm" />
                          ) : upload.image_url && upload.file_format !== 'csv' && upload.file_format !== 'excel' && upload.file_format !== 'json' && upload.file_format !== 'xml' ? (
                            <img 
                              src={upload.image_url} 
                              alt="Uploaded analytics screenshot preview" 
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                              <File className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getPlatformColor(upload.platform)}>
                              {upload.platform || 'Unknown'}
                            </Badge>
                            {upload.platform_type === 'advertising' && (
                              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">Ad</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getFormatBadge(upload.file_format)}
                            {upload.performance_rating && (
                              <Badge variant="outline" className="text-xs">
                                {upload.performance_rating}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(upload.uploaded_at), 'MMM d, yyyy')}
                            {upload.original_filename && (
                              <span className="block truncate">{upload.original_filename}</span>
                            )}
                          </p>
                          {upload.summary?.one_sentence_summary && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {upload.summary.one_sentence_summary}
                            </p>
                          )}
                        </div>
                        
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Selected Upload Details */}
            <div className="lg:col-span-3">
              {selectedUpload ? (
                <AnalysisDetail upload={selectedUpload} />
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select an upload to view detailed analysis</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
