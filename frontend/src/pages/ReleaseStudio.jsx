import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiDownload,
  FiRefreshCw,
  FiCheck,
  FiAlertCircle,
  FiLoader,
  FiPlay,
  FiImage,
  FiAward,
  FiFileText,
  FiXCircle,
  FiVideo,
  FiMaximize2,
  FiDownloadCloud,
  FiChevronDown,
  FiEdit2,
  FiSave,
  FiUpload,
  FiTrash2,
} from 'react-icons/fi';
import { apiBaseUrl } from '../services/apiClient';
import { useTheme } from '../context/ThemeContext';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import { decodeProjectRouteId } from '../utils/hashids';
import html2canvas from 'html2canvas';

const POSTER_TYPES = [
  { key: 'poster',          label: 'Official Poster',     ratio: '16:9',   desc: 'Theatrical release poster' },
  { key: 'thumbnail',       label: 'YouTube Thumbnail',   ratio: '16:9',   desc: 'Click-optimised thumbnail' },
  { key: 'poster_vertical', label: 'Vertical Poster',     ratio: '9:16',   desc: 'Mobile & social media poster' },
  { key: 'banner',          label: 'Social Banner',       ratio: '21:9',   desc: 'X, Facebook, LinkedIn header' },
];

const DURATION_OPTIONS = [
  { key: 15, label: '15 sec' },
  { key: 30, label: '30 sec' },
  { key: 60, label: '60 sec' },
];

function StatusBadge({ status }) {
  const map = {
    pending:    { cls: 'bg-surface-700/40 text-surface-400', label: 'Not Generated', icon: null },
    generating: { cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', label: 'Generating...', icon: FiLoader },
    completed:  { cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', label: 'Ready', icon: FiCheck },
    failed:     { cls: 'bg-red-500/10 text-red-400 border border-red-500/20', label: 'Failed', icon: FiAlertCircle },
    cancelled:  { cls: 'bg-neutral-500/20 text-neutral-400 border border-neutral-500/20', label: 'Cancelled', icon: FiXCircle },
  };
  const m = map[status] || map.pending;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${m.cls}`}>
      {Icon && (status === 'generating' ? <Icon size={9} className="animate-spin" /> : <Icon size={9} />)}
      {m.label}
    </span>
  );
}

// ── Custom dropdown ─────────────────────────────────────────────────────────

function CustomSelect({ options, value, onChange, d }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find(o => o.key === value);
  const labelKey = options[0]?.key;
  const displayLabel = selected?.label ?? (typeof value === 'string' ? value : String(value));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 text-[11px] font-bold rounded-lg px-3 py-2 border focus:outline-none cursor-pointer whitespace-nowrap ${
          d ? 'bg-white border-gray-200 text-gray-700 hover:border-gray-300' : 'bg-black/40 border-white/[0.06] text-surface-300 hover:border-white/20'
        }`}
      >
        {displayLabel}
        <FiChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-1 z-20 min-w-[140px] rounded-lg border shadow-lg py-1 ${
          d ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/[0.06]'
        }`}>
          {options.map(opt => {
            const optKey = typeof opt.key === 'number' ? opt.key : opt.key;
            return (
              <button
                key={String(optKey)}
                onClick={() => { onChange(optKey); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                  optKey === value
                    ? d ? 'bg-gray-100 text-gray-900' : 'bg-surface-700 text-white'
                    : d ? 'text-gray-600 hover:bg-gray-50' : 'text-surface-400 hover:bg-surface-700/50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Credits Preview (rich card) ──────────────────────────────────────────────

function CreditsPreview({ asset, d, editMode, editData, setEditData, onSaveEdit }) {
  const [credits, setCredits] = useState(null);
  const [fetching, setFetching] = useState(true);
  const url = asset?.url;
  const cardRef = useRef(null);

  useEffect(() => {
    if (!url) { setFetching(false); return; }
    setCredits(null);
    setFetching(true);
    fetch(apiBaseUrl + url)
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then(data => { setCredits(data); if (!editData) setEditData(data); })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [url]);

  if (!url || fetching) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <FiLoader size={16} className="animate-spin text-surface-500" />
      </div>
    );
  }

  if (!credits) return null;

  if (editMode && editData) {
    const fields = ['title', 'director', 'written_by', 'genre'];
    const labels = { title: 'Title', director: 'Director', written_by: 'Written By', genre: 'Genre' };
    return (
      <div className="w-full h-full p-4 flex flex-col justify-center gap-3">
        {fields.map(f => (
          <div key={f} className="flex items-center gap-2">
            <label className={`text-[9px] font-bold uppercase tracking-wider shrink-0 w-16 ${d ? 'text-gray-500' : 'text-surface-400'}`}>{labels[f]}</label>
            <input
              value={editData[f] || ''}
              onChange={e => setEditData({ ...editData, [f]: e.target.value })}
              className={`flex-1 text-[11px] rounded-lg px-2 py-1 border focus:outline-none ${
                d ? 'bg-white border-gray-200 text-gray-700' : 'bg-surface-800 border-white/[0.06] text-surface-200'
              }`}
            />
          </div>
        ))}
        <button
          onClick={onSaveEdit}
          className="self-center flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer btn-accent text-[10px] shadow-none mt-1"
        >
          <FiSave size={10} /> Save Credits
        </button>
      </div>
    );
  }

  return (
    <div ref={cardRef} className="w-full h-full p-4 flex flex-col justify-center select-none" style={{ fontFamily: "'Sofia Sans', sans-serif" }}>
      <div className={`text-lg font-black uppercase tracking-wider truncate text-center ${d ? 'text-gray-900' : 'text-white'}`}>
        {credits.title || 'Untitled'}
      </div>
      <div className={`my-2 h-px ${d ? 'bg-gray-300' : 'bg-white/20'}`} />
      <div className="space-y-0.5 text-center text-[11px]">
        <p className={d ? 'text-gray-700' : 'text-gray-300'}><span className="font-bold opacity-80">Director:</span> {credits.director}</p>
        <p className={d ? 'text-gray-700' : 'text-gray-300'}><span className="font-bold opacity-80">Written by:</span> {credits.written_by}</p>
        {credits.ai_models?.length > 0 && (
          <p className={`${d ? 'text-gray-500' : 'text-gray-400'} opacity-60`}>AI: {credits.ai_models.join(', ')}</p>
        )}
        {credits.genre && (
          <p className={d ? 'text-gray-700' : 'text-gray-300'}><span className="font-bold opacity-80">Genre:</span> {credits.genre}</p>
        )}
      </div>
    </div>
  );
}

// ── Section Components ───────────────────────────────────────────────────────

const ASPECT_MAP = {
  poster:          'aspect-video',
  thumbnail:       'aspect-video',
  poster_vertical: 'aspect-[9/16]',
  banner:          'aspect-[21/9]',
};

function PosterSection({ releaseAssets, selectedPoster, setSelectedPoster, onGenerate, onDownload, d, projectId }) {
  const asset = releaseAssets[selectedPoster];
  const info = POSTER_TYPES.find(pt => pt.key === selectedPoster);
  const isComplete = asset?.status === 'completed' && asset?.url;
  const isGen = asset?.status === 'generating';
  const previewRef = useRef(null);
  const isVertical = selectedPoster === 'poster_vertical';

  const handleFullscreen = () => {
    const el = previewRef.current?.querySelector('img');
    if (el && el.requestFullscreen) el.requestFullscreen();
  };

  const resolveAssetType = (key) => key === 'poster_vertical' ? 'poster-vertical' : key;

  const handleDelete = async () => {
    if (!window.confirm('Delete this poster asset? This cannot be undone.')) return;
    try {
      await fetch(`${apiBaseUrl}/api/assets/release_asset/release_${projectId}_${resolveAssetType(selectedPoster)}`, {
        method: 'DELETE', credentials: 'include',
      });
      window.location.reload();
    } catch (e) { console.error(e); }
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <FiImage size={16} className={d ? 'text-gray-700' : 'text-surface-300'} />
        <h2 className={`text-xs font-black uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>
          Release Posters
        </h2>
      </div>

      <div className={`flex flex-col gap-4 p-4 rounded-xl border ${
        d ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.02] border-white/[0.04]'
      }`}>
        {/* Media + Metadata left-right row */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Media preview */}
          <div ref={previewRef} className={`relative shrink-0 w-full lg:w-[320px] ${isVertical ? 'lg:w-[180px]' : ''} ${ASPECT_MAP[selectedPoster]} overflow-hidden rounded-lg border flex items-center justify-center ${
            d ? 'border-gray-200 bg-white' : 'border-white/[0.04] bg-black/40'
          }`}>
            {isComplete ? (
              <>
                <img
                  src={apiBaseUrl + asset.url}
                  alt={info?.label}
                  className="w-full h-full object-contain select-none pointer-events-none"
                  draggable={false}
                  onContextMenu={e => e.preventDefault()}
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' }}
                />
                <div className="absolute inset-0 flex items-start justify-end gap-2 p-3 opacity-0 hover:opacity-100 transition-opacity duration-200 bg-gradient-to-b from-black/30 to-transparent">
                  <button onClick={handleFullscreen} className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer" title="Fullscreen"><FiMaximize2 size={14} /></button>
                  <button onClick={() => onDownload(resolveAssetType(selectedPoster))} className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer" title="Download"><FiDownloadCloud size={14} /></button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-surface-500">
                <FiImage size={32} className="opacity-40" />
                <span className="text-[10px] font-mono">{info?.ratio}</span>
              </div>
            )}
            {isGen && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <FiLoader size={24} className="animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Right: Metadata + controls */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className={`text-[13px] font-black uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>{info?.label}</h3>
              <StatusBadge status={asset?.status || 'pending'} />
            </div>
            <p className={`text-[10px] ${d ? 'text-gray-500' : 'text-surface-500'}`}>{info?.desc}</p>
            <p className={`text-[9px] font-mono ${d ? 'text-gray-400' : 'text-surface-500'}`}>
              Type: {info?.key} · Ratio: {info?.ratio}
            </p>
            {isComplete && (
              <p className={`text-[9px] font-mono ${d ? 'text-gray-400' : 'text-surface-500'}`}>
                Generated: {asset.generated_at ? new Date(asset.generated_at).toLocaleString() : 'Recently'}
              </p>
            )}
            <div className="flex items-center gap-2 mt-auto pt-3">
              {isComplete && (
                <button onClick={() => onDownload(resolveAssetType(selectedPoster))} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${d ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-white/10 hover:bg-white/15 text-surface-300'}`}>
                  <FiDownload size={11} /> Download
                </button>
              )}
              <button onClick={() => onGenerate(resolveAssetType(selectedPoster))} disabled={asset?.status === 'generating'} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${asset?.status === 'generating' ? 'opacity-40 cursor-not-allowed' : asset?.status === 'completed' ? (d ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-white/10 hover:bg-white/15 text-surface-300') : 'btn-accent text-[10px] shadow-none'}`}>
                {asset?.status === 'generating' ? <><FiLoader size={10} className="animate-spin" /> Generating</> : asset?.status === 'completed' ? <><FiRefreshCw size={10} /> Regenerate</> : <><FiAward size={10} /> Generate</>}
              </button>
              {isComplete && (
                <button onClick={handleDelete} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${d ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'}`}>
                  <FiTrash2 size={10} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrailerSection({ asset, onGenerate, onDownload, d, trailerDuration, setTrailerDuration, projectId }) {
  const isGen = asset?.status === 'generating';
  const isComplete = asset?.status === 'completed' && asset?.url;
  const previewRef = useRef(null);

  const handleFullscreen = () => {
    const el = previewRef.current?.querySelector('video');
    if (el && el.requestFullscreen) el.requestFullscreen();
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this video promo? This cannot be undone.')) return;
    try {
      await fetch(`${apiBaseUrl}/api/assets/release_asset/release_${projectId}_trailer`, {
        method: 'DELETE', credentials: 'include',
      });
      window.location.reload();
    } catch (e) { console.error(e); }
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <FiVideo size={16} className={d ? 'text-gray-700' : 'text-surface-300'} />
        <h2 className={`text-xs font-black uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>
          Video Promo
        </h2>
      </div>

      <div className={`flex flex-col gap-4 p-4 rounded-xl border ${
        d ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.02] border-white/[0.04]'
      }`}>
        {/* Media + Metadata left-right row */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Video preview */}
          <div ref={previewRef} className="relative shrink-0 w-full lg:w-[320px] aspect-video overflow-hidden rounded-lg border flex items-center justify-center bg-black">
            {isComplete ? (
              <>
                <video
                  src={apiBaseUrl + asset.url}
                  controls
                  className="w-full h-full"
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  onContextMenu={e => e.preventDefault()}
                >
                  Your browser does not support the video tag.
                </video>
                <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <button onClick={handleFullscreen} className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer" title="Fullscreen"><FiMaximize2 size={14} /></button>
                  <button onClick={() => onDownload('trailer')} className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer" title="Download"><FiDownloadCloud size={14} /></button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-surface-500">
                <FiPlay size={36} className="opacity-40" />
                <span className="text-[10px] font-mono">Trailer preview</span>
              </div>
            )}
            {isGen && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <FiLoader size={24} className="animate-spin text-white" />
                  <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Assembling...</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Metadata + controls */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className={`text-[13px] font-black uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>Video Promo</h3>
              <StatusBadge status={asset?.status || 'pending'} />
            </div>
            <p className={`text-[10px] ${d ? 'text-gray-500' : 'text-surface-500'}`}>Trailer compiled from approved scenes</p>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] ${d ? 'text-gray-600' : 'text-surface-400'}`}>Duration:</span>
              <CustomSelect options={DURATION_OPTIONS} value={trailerDuration} onChange={v => setTrailerDuration(v)} d={d} />
            </div>
            {isComplete && asset.duration && (
              <p className={`text-[9px] font-mono ${d ? 'text-gray-400' : 'text-surface-500'}`}>
                Final duration: {asset.duration}s · Generated: {asset.generated_at ? new Date(asset.generated_at).toLocaleString() : 'Recently'}
              </p>
            )}
            <div className="flex items-center gap-2 mt-auto pt-3">
              {isComplete && (
                <button onClick={() => onDownload('trailer')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${d ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-white/10 hover:bg-white/15 text-surface-300'}`}>
                  <FiDownload size={11} /> Download
                </button>
              )}
              <button onClick={() => onGenerate('trailer', { duration: trailerDuration })} disabled={asset?.status === 'generating'} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${asset?.status === 'generating' ? 'opacity-40 cursor-not-allowed' : asset?.status === 'completed' ? (d ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-white/10 hover:bg-white/15 text-surface-300') : 'btn-accent text-[10px] shadow-none'}`}>
                {asset?.status === 'generating' ? <><FiLoader size={10} className="animate-spin" /> Compiling</> : asset?.status === 'completed' ? <><FiRefreshCw size={10} /> Regenerate</> : <><FiPlay size={10} /> Generate Trailer</>}
              </button>
              {isComplete && (
                <button onClick={handleDelete} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${d ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'}`}>
                  <FiTrash2 size={10} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CreditsSection({ asset, onGenerate, d, projectId }) {
  const isGen = asset?.status === 'generating';
  const isComplete = asset?.status === 'completed' && asset?.url;
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const cardRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveEdit = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${projectId}/release/credits`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error('Save failed');
      setEditMode(false);
      showToast('Credits saved!');
    } catch (e) {
      showToast('Failed to save credits', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportImage = async () => {
    const el = cardRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: d ? '#ffffff' : '#111111',
        useCORS: true,
      });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create image');

      const file = new File([blob], 'credits-card.png', { type: 'image/png' });
      const uploadRes = await fetch(`${apiBaseUrl}/api/editor/upload?filename=credits-card.png`, {
        method: 'POST',
        body: file,
        headers: { 'Content-Type': 'image/png' },
        credentials: 'include',
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const data = await uploadRes.json();

      try {
        const existing = JSON.parse(localStorage.getItem('editor_assets') || '[]');
        if (!existing.some(a => a.id === data.id)) {
          existing.push(data);
          localStorage.setItem('editor_assets', JSON.stringify(existing));
        }
      } catch (e) {}

      showToast('Credits card exported to Asset Library! Open Editor Studio to use it.');
    } catch (e) {
      showToast('Failed to export credits card', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteCredits = async () => {
    if (!window.confirm('Delete these end credits? This cannot be undone.')) return;
    try {
      await fetch(`${apiBaseUrl}/api/assets/release_asset/release_${projectId}_credits`, {
        method: 'DELETE', credentials: 'include',
      });
      window.location.reload();
    } catch (e) { console.error(e); }
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <FiFileText size={16} className={d ? 'text-gray-700' : 'text-surface-300'} />
        <h2 className={`text-xs font-black uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>
          End Credits
        </h2>
      </div>

      <div className={`flex flex-col gap-4 p-4 rounded-xl border ${
        d ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.02] border-white/[0.04]'
      }`}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Credits card preview */}
          <div className="shrink-0 w-full lg:w-[320px]">
            {isComplete ? (
              <div
                ref={cardRef}
                className={`w-full aspect-video rounded-lg border overflow-hidden ${
                  d ? 'border-gray-200 bg-gray-50' : 'border-white/[0.04] bg-black/60'
                }`}
              >
                <CreditsPreview
                  asset={asset}
                  d={d}
                  editMode={editMode}
                  editData={editData}
                  setEditData={setEditData}
                  onSaveEdit={handleSaveEdit}
                />
              </div>
            ) : (
              <div className={`w-full aspect-video rounded-lg border flex items-center justify-center ${
                d ? 'border-gray-200 bg-gray-50' : 'border-white/[0.04] bg-black/40'
              }`}>
                <div className="flex flex-col items-center gap-2 text-surface-500">
                  <FiFileText size={28} className="opacity-40" />
                  <span className="text-[9px] font-mono">Credits preview</span>
                </div>
              </div>
            )}
            {isGen && (
              <div className="w-full aspect-video rounded-lg border flex items-center justify-center bg-black/40">
                <FiLoader size={20} className="animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Right: Metadata + controls */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className={`text-[13px] font-black uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>End Credits</h3>
              <StatusBadge status={asset?.status || 'pending'} />
            </div>
            {asset?.status === 'failed' && <p className="text-[9px] text-red-400">{asset?.error}</p>}
            <p className={`text-[10px] ${d ? 'text-gray-500' : 'text-surface-500'}`}>
              Automatically built from your project metadata — title, director, AI models used, and generation timestamp.
            </p>
            {isComplete && (
              <p className={`text-[9px] font-mono ${d ? 'text-gray-400' : 'text-surface-500'}`}>
                Generated: {asset.generated_at ? new Date(asset.generated_at).toLocaleString() : 'Recently'}
              </p>
            )}
            <div className="flex items-center gap-2 mt-auto pt-3 flex-wrap">
              {isComplete && !editMode && (
                <>
                  <button onClick={() => setEditMode(true)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${d ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-white/10 hover:bg-white/15 text-surface-300'}`}>
                    <FiEdit2 size={11} /> Edit
                  </button>
                  <button onClick={handleExportImage} disabled={exporting} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${d ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-white/10 hover:bg-white/15 text-surface-300'}`}>
                    {exporting ? <><FiLoader size={11} className="animate-spin" /> Exporting</> : <><FiUpload size={11} /> Export to Assets</>}
                  </button>
                </>
              )}
              <button onClick={() => onGenerate('credits')} disabled={asset?.status === 'generating'} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${asset?.status === 'generating' ? 'opacity-40 cursor-not-allowed' : asset?.status === 'completed' ? (d ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-white/10 hover:bg-white/15 text-surface-300') : 'btn-accent text-[10px] shadow-none'}`}>
                {asset?.status === 'generating' ? <><FiLoader size={10} className="animate-spin" /> Generating</> : asset?.status === 'completed' ? <><FiRefreshCw size={10} /> Regenerate</> : <><FiFileText size={10} /> Generate Credits</>}
              </button>
              {isComplete && (
                <button onClick={handleDeleteCredits} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${d ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'}`}>
                  <FiTrash2 size={10} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl text-[11px] font-bold shadow-lg transition-all ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </section>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ReleaseStudio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDayMode: d } = useTheme();
  const pollRef = useRef(null);
  const optimisticRef = useRef({});
  const numericId = decodeProjectRouteId(id) || 0;
  const hasValidProject = !!numericId && numericId > 0;

  const [project, setProject] = useState(null);
  const [releaseAssets, setReleaseAssets] = useState({});
  const [trailerDuration, setTrailerDuration] = useState(30);
  const [loading, setLoading] = useState(true);
  const [selectedPoster, setSelectedPoster] = useState('poster');

  const fetchReleaseStatus = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${numericId}/release`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setReleaseAssets(prev => {
          const next = { ...data };
          for (const key of Object.keys(optimisticRef.current)) {
            const dbStatus = data[key]?.status;
            if (!dbStatus || dbStatus === 'pending' || dbStatus === 'cancelled') {
              if (prev[key]?.status === 'generating') {
                next[key] = prev[key];
                continue;
              }
            }
            delete optimisticRef.current[key];
          }
          return next;
        });
      }
    } catch (e) { console.error(e); }
  }, [numericId]);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${numericId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (e) { console.error(e); }
  }, [numericId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProject(), fetchReleaseStatus()]).finally(() => setLoading(false));
  }, [fetchProject, fetchReleaseStatus]);

  useEffect(() => {
    const hasGen = Object.values(releaseAssets).some(a => a?.status === 'generating');
    if (hasGen) {
      pollRef.current = setInterval(fetchReleaseStatus, 3000);
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [releaseAssets, fetchReleaseStatus]);

  const handleGenerate = async (assetType, extraBody) => {
    optimisticRef.current[assetType] = true;
    setReleaseAssets(prev => ({
      ...prev,
      [assetType]: { ...(prev[assetType] || {}), status: 'generating' },
    }));
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${numericId}/release/generate/${assetType}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: extraBody ? JSON.stringify(extraBody) : undefined,
      });
      // For credits which is synchronous, immediately apply the returned status
      if (assetType === 'credits' && res.ok) {
        const result = await res.json();
        if (result.status === 'completed') {
          setReleaseAssets(prev => ({
            ...prev,
            credits: { status: 'completed', url: prev.credits?.url, credit_data: result.credits },
          }));
          delete optimisticRef.current.credits;
          return;
        }
      }
    } catch (e) { console.error(e); }
    await fetchReleaseStatus();
  };

  const handleCancel = async () => {
    try {
      await fetch(`${apiBaseUrl}/api/projects/${numericId}/release/cancel`, { method: 'POST', credentials: 'include' });
      optimisticRef.current = {};
      await fetchReleaseStatus();
    } catch (e) { console.error(e); }
  };

  const handleDownload = () => {
    window.open(`${apiBaseUrl}/api/projects/${numericId}/release/download`, '_blank');
  };

  const handleAssetDownload = (assetType) => {
    const a = document.createElement('a');
    a.href = `${apiBaseUrl}/api/projects/${numericId}/release/download/${assetType}`;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const anyGenerating = Object.values(releaseAssets).some(a => a?.status === 'generating');
  const allCompleted = ['poster', 'thumbnail', 'poster_vertical', 'banner', 'trailer', 'credits']
    .every(k => releaseAssets[k]?.status === 'completed');

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 ${d ? 'bg-white' : 'bg-surface-950'}`}>
        <header className={`shrink-0 flex items-center justify-between px-6 py-4 border-b ${
          d ? 'border-gray-200' : 'border-white/[0.04]'
        }`}>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className={`p-2 rounded-lg transition-colors cursor-pointer ${d ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/5 text-surface-400'}`}>
              <FiArrowLeft size={16} />
            </button>
            <div>
              <h1 className={`text-sm font-black uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>Release Studio</h1>
              {project && (
                <p className={`text-[10px] font-mono mt-0.5 ${d ? 'text-gray-500' : 'text-surface-500'}`}>
                  {project.title} · {project.production_type || 'Film'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {anyGenerating && (
              <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider cursor-pointer bg-red-600 hover:bg-red-500 text-white">
                <FiXCircle size={12} /> Cancel
              </button>
            )}
            {allCompleted && (
              <button onClick={handleDownload} className="btn-accent flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] shadow-none">
                <FiDownload size={12} /> Download Package
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="p-6 space-y-8 flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <FiLoader size={24} className="animate-spin text-surface-500" />
              </div>
            ) : !hasValidProject || !project ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <FiAward size={48} className="text-surface-600/40" />
                <div className="text-center">
                  <p className={`text-sm font-black uppercase tracking-wider ${d ? 'text-gray-800' : 'text-white'}`}>
                    Nothing to release yet
                  </p>
                  <p className={`text-[11px] mt-1.5 ${d ? 'text-gray-500' : 'text-surface-500'}`}>
                    Select a production from the sidebar, or create one in Studio first, then return here to prepare your release package.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className={`mt-2 px-5 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                    d ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  Go to Studio
                </button>
              </div>
            ) : (
              <>
                <PosterSection
                  releaseAssets={releaseAssets}
                  selectedPoster={selectedPoster}
                  setSelectedPoster={setSelectedPoster}
                  onGenerate={handleGenerate}
                  onDownload={handleAssetDownload}
                  d={d}
                  projectId={numericId}
                />
                <TrailerSection
                  asset={releaseAssets.trailer}
                  onGenerate={handleGenerate}
                  onDownload={handleAssetDownload}
                  d={d}
                  trailerDuration={trailerDuration}
                  setTrailerDuration={setTrailerDuration}
                  projectId={numericId}
                />
                <CreditsSection
                  asset={releaseAssets.credits}
                  onGenerate={handleGenerate}
                  d={d}
                  projectId={numericId}
                />
                {allCompleted && (
                  <div className={`flex items-center justify-center p-6 rounded-xl border ${
                    d ? 'bg-emerald-50/50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/20'
                  }`}>
                    <button onClick={handleDownload} className="btn-accent flex items-center gap-3 px-8 py-3 rounded-xl text-[11px] shadow-none">
                      <FiDownload size={16} />
                      <span className="font-black uppercase tracking-wider">Download Release Package</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
