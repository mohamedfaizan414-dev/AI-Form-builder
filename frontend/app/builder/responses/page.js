'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Loader2, Paperclip, ExternalLink, Search, 
  ChevronLeft, ChevronRight, BarChart3, Calendar, Inbox,
  Download, FileSpreadsheet, FileCode, Sparkles, X, RefreshCw, Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function ResponsesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const formId = params.get('id');
  const { user, loading: authLoading, authFetch } = useAuth();

  const [form, setForm] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Modals Core States
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedSubIndex, setSelectedSubIndex] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const fetchData = async () => {
    if (!formId || !user) return;
    setLoading(true);
    try {
      const formRes = await fetch(`${API}/forms/${formId}`);
      const formData = await formRes.json();
      setForm(formData);

      const subsRes = await authFetch(`/forms/${formId}/submissions`);
      const subsData = await subsRes.json();
      setSubmissions(Array.isArray(subsData) ? subsData : []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [formId, user]);

  const runAiSummaryAnalysis = async () => {
    setAiLoading(true);
    setAiSummary('');
    setShowAiModal(true);
    try {
      const res = await authFetch(`/ai/summarize/${formId}`);
      const data = await res.json();
      setAiSummary(data.summary || 'No summary overview could be calculated.');
    } catch (err) {
      setAiSummary('Failed to aggregate structural data insights.');
    } finally {
      setAiLoading(false);
    }
  };

  const cleanValueForCsv = (val) => {
    if (!val) return '';
    if (typeof val === 'object' && val.url) return val.url;
    if (Array.isArray(val)) return val.join('; ');
    return String(val).replace(/"/g, '""');
  };

  // Fixed Native Blob Exporter Method
  const handleDownloadCSV = () => {
    if (!form || submissions.length === 0) return;
    const targetFields = form.schema || [];
    
    const headers = ['Submission ID', 'Timestamp', ...targetFields.map(f => f.label)];
    const rows = submissions.map((sub, index) => {
      const idStr = `Row #${submissions.length - index}`;
      const timeStr = new Date(sub.created_at).toLocaleString();
      const fieldAnswers = targetFields.map(f => cleanValueForCsv(sub.answers?.[f.id]));
      return [idStr, timeStr, ...fieldAnswers].map(v => `"${v}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.setAttribute('download', `${form.title.toLowerCase().replace(/\s+/g, '_')}_submissions.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownloadJSON = () => {
    if (!form || submissions.length === 0) return;
    const exportData = submissions.map((sub, index) => ({
      responseIndex: submissions.length - index,
      submittedAt: sub.created_at,
      data: sub.answers
    }));

    const dataBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(dataBlob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', blobUrl);
    downloadAnchor.setAttribute('download', `${form.title.toLowerCase().replace(/\s+/g, '_')}_submissions.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);
  };

  if (authLoading || loading || !form) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0c10] text-white/40 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-sm font-medium tracking-wide">Assembling records layout...</span>
      </div>
    );
  }

  const fields = form.schema || [];
  const filteredSubmissions = submissions.filter((sub) => {
    const searchString = JSON.stringify(sub.answers || {}).toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSubmissions.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#e7e9ec] mt-4 flex flex-col antialiased">
      
      {/* Redesigned Responsive Mobile-First Header */}
      <header className="sticky top-0 z-40 bg-[#0a0c10]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => router.push(`/builder?id=${formId}`)} 
                className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-xl transition-all text-white/70 hover:text-white shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
             
                <h1 className="font-display font-semibold text-lg sm:text-2xl truncate text-white mt-1 tracking-tight">{form.title}</h1>
              </div>
            </div>

            <button
              onClick={fetchData}
              className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-xl text-white/60 md:block hidden"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {/* Action Header Button Controls Row - Responsive Flow */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-white/[0.03]">
            <div className="flex items-center gap-2 text-xs text-white/40 font-medium">
              <Inbox className="w-4 h-4 text-white/20" />
              <span>Total Received Volumetric Rows:</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{submissions.length}</span>
            </div>

            <div className="grid grid-cols-3 sm:flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={runAiSummaryAnalysis}
                className="col-span-3 sm:w-auto flex items-center justify-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-[#0a0c10] px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 fill-[#0a0c10]/10" /> <span className="truncate">AI Summary</span>
              </button>
              <button
                onClick={handleDownloadCSV}
                disabled={submissions.length === 0}
                className="flex items-center pl-1 pr-1 justify-center gap-1.5 text-xs font-medium bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-white/90 py-2.5 rounded-xl transition-all disabled:opacity-30"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> <span>CSV</span>
              </button>
              <button
                onClick={handleDownloadJSON}
                disabled={submissions.length === 0}
                className="flex items-center justify-center gap-1.5 text-xs font-medium pl-1 pr-1 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-white/90 py-2.5 rounded-xl transition-all disabled:opacity-30"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-400" /> <span> JSON</span>
              </button>
              <button
                onClick={fetchData}
                className="flex sm:hidden items-center justify-center p-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-white/60"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Core View Area Dashboard */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Search Input Box */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-white/20 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search responses parameters..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full bg-[#12151b] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all"
          />
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center bg-[#12151b] border border-white/5 rounded-2xl max-w-sm mx-auto">
            <Inbox className="w-6 h-6 text-white/20 mx-auto mb-2" />
            <h4 className="font-semibold text-white text-sm">No matches found</h4>
          </div>
        ) : (
          <>
            {/* Desktop View Table Component Layout */}
            <div className="hidden md:block overflow-hidden bg-[#12151b] border border-white/5 rounded-2xl shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-white/40">
                      <th className="py-4 px-6 w-20 text-center">Action</th>
                      <th className="py-4 px-6 w-20 text-center">Index</th>
                      <th className="py-4 px-6 w-44">Received Date</th>
                      {fields.map((field) => (
                        <th key={field.id} className="py-4 px-6 max-w-xs truncate" title={field.label}>
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] text-sm text-white/80">
                    {currentItems.map((sub, index) => {
                      const absoluteIndex = submissions.length - (indexOfFirstItem + index);
                      return (
                        <tr key={sub.id} className="hover:bg-white/[0.01] transition-colors group">
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => { setSelectedSubmission(sub); setSelectedSubIndex(absoluteIndex); }}
                              className="p-1.5 bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/5 rounded-lg transition-all"
                              title="Inspect Full Form Payload"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          <td className="py-4 px-6 text-center font-mono text-xs text-white/30 font-bold">
                            #{absoluteIndex}
                          </td>
                          <td className="py-4 px-6 text-xs text-white/40">
                            {new Date(sub.created_at).toLocaleDateString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          {fields.map((field) => (
                            <td key={field.id} className="py-4 px-6 max-w-xs truncate font-medium text-white/90">
                              <ResponseCellRenderer data={sub.answers?.[field.id]} blockTruncate={true} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Redesigned Grid System Cards Mode (Optimized & Non-Congested for Mobile) */}
            <div className="block md:hidden space-y-3">
              {currentItems.map((sub, index) => {
                const absoluteIndex = submissions.length - (indexOfFirstItem + index);
                return (
                  <div 
                    key={sub.id} 
                    onClick={() => { setSelectedSubmission(sub); setSelectedSubIndex(absoluteIndex); }}
                    className="bg-[#12151b] border border-white/5 hover:border-white/10 rounded-xl p-4 space-y-3 shadow-md active:scale-[0.99] transition-transform cursor-pointer"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs font-bold text-emerald-400 font-mono">RESPONSE #{absoluteIndex}</span>
                      <div className="flex items-center gap-2 text-white/40 text-[11px]">
                        <span>{new Date(sub.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        <Eye className="w-3.5 h-3.5 text-white/20" />
                      </div>
                    </div>
                    {/* Render a quick horizontal visual snippet of first 2 fields inside card context block */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      {fields.slice(0, 2).map((field) => (
                        <div key={field.id} className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-white/30 tracking-wide block truncate">{field.label}</span>
                          <div className="text-xs text-white/80 font-medium truncate mt-0.5">
                            <ResponseCellRenderer data={sub.answers?.[field.id]} blockTruncate={true} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-emerald-400/70 font-semibold text-right pt-1 block">Tap to expand full detailed profile →</div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls Section Container */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs font-medium text-white/40">
              <div>
                Displaying rows <span className="text-white font-semibold">{indexOfFirstItem + 1}</span> - <span className="text-white font-semibold">{Math.min(indexOfLastItem, filteredSubmissions.length)}</span> of <span className="text-white font-semibold">{filteredSubmissions.length}</span> entries
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 disabled:opacity-20 rounded-xl transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 py-1.5 bg-white/5 border border-white/5 font-mono rounded-xl text-white">
                  {currentPage} / {totalPages}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 disabled:opacity-20 rounded-xl transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* NEW: Full-Screen Detailed Profile Record Inspector Modal Drawer (Highly Mobile Responsive) */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#12151b] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div>
                <h3 className="font-display font-semibold text-white text-base">Detailed Submission Record</h3>
                <p className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5 uppercase tracking-wide">Inspection Position #{selectedSubIndex}</p>
              </div>
              <button 
                onClick={() => { setSelectedSubmission(null); setSelectedSubIndex(null); }}
                className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar bg-canvas/30">
              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex justify-between text-xs text-white/40">
                <span>Submission Time:</span>
                <span className="font-medium text-white/70">{new Date(selectedSubmission.created_at).toLocaleString()}</span>
              </div>
              <div className="space-y-4">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 block">{field.label}</span>
                    <div className="bg-[#12151b] p-3 border border-white/5 rounded-xl text-sm font-medium text-white/90 break-words leading-relaxed">
                      <ResponseCellRenderer data={selectedSubmission.answers?.[field.id]} blockTruncate={false} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-[#12151b] flex justify-end">
              <button
                onClick={() => { setSelectedSubmission(null); setSelectedSubIndex(null); }}
                className="w-full sm:w-auto px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-xs border border-white/5 text-white/80 transition-all"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Summary Analytics Window Drawer Model */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#12151b] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="font-display font-semibold text-white text-base">AI Executive Insights Summary</h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-white/40"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 p-5 overflow-y-auto text-sm leading-relaxed text-white/80 whitespace-pre-wrap custom-scrollbar">
              {aiLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <p className="text-xs text-white/40">Parsing metric trends algorithms...</p>
                </div>
              ) : (
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 shadow-inner">{aiSummary}</div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-white/5 flex justify-end bg-white/[0.01]">
              <button onClick={() => setShowAiModal(false)} className="px-4 py-2 bg-white/5 rounded-xl text-xs font-semibold text-white/70 border border-white/5">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ResponseCellRenderer({ data, blockTruncate }) {
  if (data && typeof data === 'object' && data.url) {
    const checkImage = data.resource_type === 'image' || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(data.format?.toLowerCase());
    return (
      <div className="flex items-center gap-2 max-w-full">
        {checkImage ? (
          <img src={data.url} alt="Mini preview" className="w-7 h-7 object-cover rounded-md border border-white/10 bg-black shrink-0" />
        ) : (
          <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0"><Paperclip className="w-3.5 h-3.5" /></div>
        )}
        <div className="min-w-0 flex-1 truncate">
          <a href={data.url} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-1 truncate">
            <span className="truncate">{data.name || "View Link"}</span>
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          </a>
        </div>
      </div>
    );
  }

  const strValue = Array.isArray(data) ? data.join(', ') : String(data ?? '');
  if (!strValue.trim()) return <em className="text-white/20 font-light text-xs">Left blank</em>;

  return <span className={blockTruncate ? "truncate block max-w-[180px]" : "w-full"}>{strValue}</span>;
}

export default function ResponsesPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-white/40 bg-[#0a0c10]">Loading analytical framework...</div>}>
      <ResponsesInner />
    </Suspense>
  );
}