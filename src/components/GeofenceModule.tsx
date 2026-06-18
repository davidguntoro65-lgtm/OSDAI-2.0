import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Shield, RefreshCcw, Save, CheckCircle2, AlertTriangle,
  History, Download, Filter, Search, ChevronLeft, ChevronRight,
  Navigation, Target, Eye, EyeOff, BarChart3, Clock, Users,
  Crosshair, Map, Info, Loader2, FileText, Archive, TrendingUp,
  Radio, AlertCircle, CheckCircle,
} from 'lucide-react';
import { C } from '@/lib/themeC';

// ── Types ─────────────────────────────────────────────────────────────────────
interface GeofenceConfig {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  description?: string;
  updatedAt: string;
  createdAt: string;
}

interface ChangeLog {
  id: string;
  changedByName?: string;
  prevLatitude?: number;
  prevLongitude?: number;
  prevRadius?: number;
  newLatitude: number;
  newLongitude: number;
  newRadius: number;
  newName?: string;
  reason?: string;
  createdAt: string;
}

interface GpsLog {
  id: string;
  lat: number;
  lng: number;
  accuracy: number;
  isMock: boolean;
  deviceInfo?: string;
  timestamp: string;
  distance: number;
  isInside: boolean;
  student: {
    user: { name: string };
    class?: { name: string };
  };
}

interface ReportResult {
  logs: GpsLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Summary {
  total: number;
  mockCount: number;
  validCount: number;
  insideGeofenceCount: number;
  outsideGeofenceCount: number;
  integrityRate: number;
  geofenceComplianceRate: number;
}

// ── Small helpers ─────────────────────────────────────────────────────────────
const Pill = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
    style={{ background: ok ? '#F0FDF4' : '#FEF2F2', color: ok ? '#15803D' : '#DC2626' }}>
    <div className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? '#10B981' : '#EF4444' }} />
    {label}
  </span>
);

const StatCard = ({ label, value, unit, icon: Icon, color, sub }: any) => (
  <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
    <div className="flex items-center gap-2 mb-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}14` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color: C.textMuted }}>{label}</span>
    </div>
    <div className="flex items-end gap-1">
      <span className="text-2xl font-black" style={{ color: C.text }}>{value}</span>
      {unit && <span className="text-xs font-semibold mb-1" style={{ color: C.textMuted }}>{unit}</span>}
    </div>
    {sub && <p className="text-[10px] mt-1" style={{ color: C.textMuted }}>{sub}</p>}
  </div>
);

// ── Map Preview (OpenStreetMap embed via iframe) ───────────────────────────────
const MapPreview = ({ lat, lng, radius, name }: { lat: number; lng: number; radius: number; name: string }) => {
  const zoom = radius <= 100 ? 18 : radius <= 300 ? 17 : radius <= 1000 ? 16 : 15;
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div className="rounded-xl overflow-hidden border relative" style={{ border: `1px solid ${C.border}` }}>
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-sm"
        style={{ background: C.card, color: C.primary, border: `1px solid ${C.border}` }}>
        <MapPin size={11} />
        {name} · r={radius}m
      </div>
      <iframe
        src={url}
        width="100%"
        height="260"
        style={{ border: 'none', display: 'block' }}
        title="Peta Geofence Sekolah"
        loading="lazy"
      />
      <div className="absolute bottom-2 right-2 text-[9px] px-2 py-1 rounded-md"
        style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}>
        © OpenStreetMap
      </div>
    </div>
  );
};

// ── Tab: Konfigurasi ──────────────────────────────────────────────────────────
const TabKonfigurasi = ({ authToken }: { authToken: string }) => {
  const [config, setConfig] = useState<GeofenceConfig | null>(null);
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', radiusMeters: '', description: '', reason: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [preview, setPreview] = useState({ lat: -7.8123, lng: 110.9234, radius: 200 });
  const [showPreview, setShowPreview] = useState(true);
  const [testResult, setTestResult] = useState<null | { isInside: boolean; distance: number }>(null);
  const [testCoords, setTestCoords] = useState({ lat: '', lng: '' });

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gps/geofence', { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) {
        const data: GeofenceConfig = await res.json();
        setConfig(data);
        const f = {
          name: data.name,
          latitude: String(data.latitude),
          longitude: String(data.longitude),
          radiusMeters: String(data.radiusMeters),
          description: data.description || '',
          reason: '',
        };
        setForm(f);
        setPreview({ lat: data.latitude, lng: data.longitude, radius: data.radiusMeters });
      }
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'latitude' || field === 'longitude' || field === 'radiusMeters') {
      const lat = field === 'latitude' ? parseFloat(value) : parseFloat(form.latitude);
      const lng = field === 'longitude' ? parseFloat(value) : parseFloat(form.longitude);
      const radius = field === 'radiusMeters' ? parseInt(value) : parseInt(form.radiusMeters);
      if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) setPreview({ lat, lng, radius });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch('/api/gps/geofence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          name: form.name,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          radiusMeters: parseInt(form.radiusMeters),
          description: form.description,
          reason: form.reason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: 'ok', msg: 'Konfigurasi geofence berhasil disimpan!' });
        setForm(prev => ({ ...prev, reason: '' }));
        await fetchConfig();
      } else {
        setToast({ type: 'err', msg: data.error || 'Gagal menyimpan konfigurasi' });
      }
    } catch {
      setToast({ type: 'err', msg: 'Koneksi ke server gagal' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleTest = () => {
    const lat = parseFloat(testCoords.lat);
    const lng = parseFloat(testCoords.lng);
    if (isNaN(lat) || isNaN(lng)) return;
    const R = 6371e3;
    const φ1 = (lat * Math.PI) / 180, φ2 = (preview.lat * Math.PI) / 180;
    const Δφ = ((preview.lat - lat) * Math.PI) / 180, Δλ = ((preview.lng - lng) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    setTestResult({ isInside: distance <= preview.radius, distance });
  };

  const useSchoolDefault = () => {
    setForm(prev => ({ ...prev, latitude: '-7.8123', longitude: '110.9234', name: 'SMKN 1 Wonogiri', radiusMeters: '200' }));
    setPreview({ lat: -7.8123, lng: 110.9234, radius: 200 });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin" style={{ color: C.primary }} /></div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black" style={{ color: C.text }}>Konfigurasi Geofence Sekolah</h2>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>
            Atur titik koordinat dan radius kehadiran siswa SMKN 1 Wonogiri
          </p>
        </div>
        <div className="flex items-center gap-2">
          {config && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: '#F0FDF4', color: '#15803D' }}>
              Aktif · Diperbarui {new Date(config.updatedAt).toLocaleDateString('id-ID')}
            </span>
          )}
          <button onClick={fetchConfig} className="p-2 rounded-lg border transition-all hover:bg-gray-50" style={{ borderColor: C.border }}>
            <RefreshCcw size={14} style={{ color: C.textMuted }} />
          </button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: toast.type === 'ok' ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${toast.type === 'ok' ? '#86EFAC' : '#FCA5A5'}`,
              color: toast.type === 'ok' ? '#15803D' : '#DC2626',
            }}
          >
            {toast.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <div className="rounded-xl p-5 space-y-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold flex items-center gap-2" style={{ color: C.text }}>
                <Target size={15} style={{ color: C.primary }} />
                Parameter Geofence
              </p>
              <button onClick={useSchoolDefault}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ background: `${C.primary}14`, color: C.primary }}>
                Reset Default
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: C.textMuted }}>Nama Lokasi</label>
              <input value={form.name} onChange={e => handleFormChange('name', e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-sm outline-none transition-all"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                onFocus={e => (e.currentTarget.style.borderColor = C.primary)}
                onBlur={e => (e.currentTarget.style.borderColor = C.border)}
                placeholder="SMKN 1 Wonogiri" />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: C.textMuted }}>Latitude</label>
                <input value={form.latitude} onChange={e => handleFormChange('latitude', e.target.value)}
                  type="number" step="0.00001"
                  className="w-full h-9 px-3 rounded-lg text-sm outline-none transition-all font-mono"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                  onFocus={e => (e.currentTarget.style.borderColor = C.primary)}
                  onBlur={e => (e.currentTarget.style.borderColor = C.border)}
                  placeholder="-7.81230" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: C.textMuted }}>Longitude</label>
                <input value={form.longitude} onChange={e => handleFormChange('longitude', e.target.value)}
                  type="number" step="0.00001"
                  className="w-full h-9 px-3 rounded-lg text-sm outline-none transition-all font-mono"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                  onFocus={e => (e.currentTarget.style.borderColor = C.primary)}
                  onBlur={e => (e.currentTarget.style.borderColor = C.border)}
                  placeholder="110.92340" />
              </div>
            </div>

            {/* Radius */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: C.textMuted }}>
                Radius (meter) — saat ini: <span style={{ color: C.primary }}>{form.radiusMeters || 200} m</span>
              </label>
              <div className="flex items-center gap-3">
                <input value={form.radiusMeters} onChange={e => handleFormChange('radiusMeters', e.target.value)}
                  type="range" min="10" max="2000" step="10"
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: C.primary }} />
                <input value={form.radiusMeters} onChange={e => handleFormChange('radiusMeters', e.target.value)}
                  type="number" min="10" max="10000"
                  className="w-20 h-9 px-2 rounded-lg text-sm outline-none transition-all text-center font-mono"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                  onFocus={e => (e.currentTarget.style.borderColor = C.primary)}
                  onBlur={e => (e.currentTarget.style.borderColor = C.border)} />
              </div>
              <div className="flex justify-between text-[9px] mt-1" style={{ color: C.textMuted }}>
                <span>10m (ketat)</span><span>500m (normal)</span><span>2000m (luas)</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: C.textMuted }}>Keterangan (opsional)</label>
              <textarea value={form.description} onChange={e => handleFormChange('description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all resize-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                onFocus={e => (e.currentTarget.style.borderColor = C.primary)}
                onBlur={e => (e.currentTarget.style.borderColor = C.border)}
                placeholder="Catatan tentang konfigurasi geofence..." />
            </div>

            {/* Reason */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider mb-1.5 block" style={{ color: C.textMuted }}>Alasan Perubahan</label>
              <input value={form.reason} onChange={e => handleFormChange('reason', e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-sm outline-none transition-all"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                onFocus={e => (e.currentTarget.style.borderColor = C.primary)}
                onBlur={e => (e.currentTarget.style.borderColor = C.border)}
                placeholder="Contoh: Penyesuaian setelah pembangunan gedung baru" />
            </div>

            {/* Save Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving}
              className="w-full h-10 rounded-xl text-white text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #cc4a00 100%)`, boxShadow: `0 4px 16px ${C.primary}35` }}
            >
              {saving ? <><Loader2 size={15} className="animate-spin" /> Menyimpan...</> : <><Save size={15} /> Simpan Konfigurasi</>}
            </motion.button>
          </div>

          {/* Test Validator */}
          <div className="rounded-xl p-5 space-y-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-sm font-bold flex items-center gap-2" style={{ color: C.text }}>
              <Crosshair size={15} style={{ color: '#6366f1' }} />
              Uji Koordinat (Test Validator)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider mb-1 block" style={{ color: C.textMuted }}>Lat Uji</label>
                <input value={testCoords.lat} onChange={e => setTestCoords(p => ({ ...p, lat: e.target.value }))}
                  type="number" step="0.00001"
                  className="w-full h-9 px-3 rounded-lg text-sm outline-none font-mono transition-all"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                  onBlur={e => (e.currentTarget.style.borderColor = C.border)}
                  placeholder="-7.81500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider mb-1 block" style={{ color: C.textMuted }}>Lng Uji</label>
                <input value={testCoords.lng} onChange={e => setTestCoords(p => ({ ...p, lng: e.target.value }))}
                  type="number" step="0.00001"
                  className="w-full h-9 px-3 rounded-lg text-sm outline-none font-mono transition-all"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                  onBlur={e => (e.currentTarget.style.borderColor = C.border)}
                  placeholder="110.92500" />
              </div>
            </div>
            <button onClick={handleTest}
              className="w-full h-9 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: '#EEF2FF', color: '#6366f1', border: '1px solid #C7D2FE' }}>
              <Navigation size={13} /> Uji Sekarang
            </button>
            <AnimatePresence>
              {testResult && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      background: testResult.isInside ? '#F0FDF4' : '#FEF2F2',
                      border: `1px solid ${testResult.isInside ? '#86EFAC' : '#FCA5A5'}`,
                    }}>
                    <div className="flex items-center gap-2">
                      {testResult.isInside
                        ? <CheckCircle size={16} style={{ color: '#10B981' }} />
                        : <AlertCircle size={16} style={{ color: '#EF4444' }} />}
                      <span className="text-sm font-bold" style={{ color: testResult.isInside ? '#15803D' : '#DC2626' }}>
                        {testResult.isInside ? 'Di dalam radius' : 'Di luar radius'}
                      </span>
                    </div>
                    <span className="text-xs font-black font-mono" style={{ color: testResult.isInside ? '#15803D' : '#DC2626' }}>
                      {testResult.distance} m
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Map Preview */}
        <div className="space-y-4">
          <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold flex items-center gap-2" style={{ color: C.text }}>
                <Map size={15} style={{ color: '#0ea5e9' }} />
                Pratinjau Peta
              </p>
              <button onClick={() => setShowPreview(p => !p)}
                className="p-1.5 rounded-lg transition-all hover:bg-gray-50" style={{ color: C.textMuted }}>
                {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            {showPreview && (
              <MapPreview lat={preview.lat} lng={preview.lng} radius={preview.radius} name={form.name || 'Sekolah'} />
            )}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: 'Latitude', value: preview.lat.toFixed(5), color: '#6366f1' },
                { label: 'Longitude', value: preview.lng.toFixed(5), color: '#0ea5e9' },
                { label: 'Radius', value: `${preview.radius} m`, color: C.primary },
              ].map(item => (
                <div key={item.label} className="p-2 rounded-lg text-center" style={{ background: C.bg }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.textMuted }}>{item.label}</p>
                  <p className="text-xs font-black font-mono mt-0.5" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Current Config Info */}
          {config && (
            <div className="rounded-xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <p className="text-sm font-bold flex items-center gap-2 mb-3" style={{ color: C.text }}>
                <Info size={15} style={{ color: '#F59E0B' }} />
                Konfigurasi Tersimpan
              </p>
              <div className="space-y-2 text-xs" style={{ color: C.textSub }}>
                <div className="flex justify-between"><span style={{ color: C.textMuted }}>Nama</span><span className="font-bold">{config.name}</span></div>
                <div className="flex justify-between"><span style={{ color: C.textMuted }}>Koordinat</span><span className="font-mono font-bold">{config.latitude}, {config.longitude}</span></div>
                <div className="flex justify-between"><span style={{ color: C.textMuted }}>Radius</span><span className="font-bold">{config.radiusMeters} m</span></div>
                <div className="flex justify-between"><span style={{ color: C.textMuted }}>Status</span><Pill ok={config.isActive} label={config.isActive ? 'Aktif' : 'Nonaktif'} /></div>
                <div className="flex justify-between"><span style={{ color: C.textMuted }}>Terakhir diubah</span><span className="font-bold">{new Date(config.updatedAt).toLocaleString('id-ID')}</span></div>
                {config.description && <div className="pt-2 border-t" style={{ borderColor: C.border }}><p style={{ color: C.textMuted }}>{config.description}</p></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Tab: Laporan Integritas ───────────────────────────────────────────────────
const TabLaporan = ({ authToken }: { authToken: string }) => {
  const [result, setResult] = useState<ReportResult | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    studentName: '',
    isMock: '',
    page: 1,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.isMock !== '') params.set('isMock', filters.isMock);
      params.set('page', String(filters.page));
      params.set('limit', '30');

      const [rRes, sRes] = await Promise.all([
        fetch(`/api/gps/reports?${params}`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`/api/gps/reports/summary?dateFrom=${filters.dateFrom}&dateTo=${filters.dateTo}`, { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      if (rRes.ok) setResult(await rRes.json());
      if (sRes.ok) setSummary(await sRes.json());
    } finally {
      setLoading(false);
    }
  }, [authToken, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.isMock !== '') params.set('isMock', filters.isMock);
      const res = await fetch(`/api/gps/reports/export?${params}`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan-gps-${filters.dateFrom}-${filters.dateTo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  const filteredLogs = (result?.logs || []).filter(l =>
    !filters.studentName || l.student?.user?.name?.toLowerCase().includes(filters.studentName.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black" style={{ color: C.text }}>Laporan Integritas GPS</h2>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Riwayat log GPS absensi siswa dengan analisis geofence</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:bg-gray-50"
            style={{ borderColor: C.border, color: C.textMuted }}>
            <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: `${C.primary}14`, color: C.primary, border: `1px solid ${C.primary}30` }}>
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Log" value={summary.total} icon={Radio} color="#6366f1" sub="Semua data" />
          <StatCard label="Integritas" value={`${summary.integrityRate}%`} icon={Shield} color="#10B981" sub={`${summary.validCount} valid`} />
          <StatCard label="Kepatuhan GPS" value={`${summary.geofenceComplianceRate}%`} icon={Target} color={C.primary} sub={`${summary.insideGeofenceCount} dalam radius`} />
          <StatCard label="Mock GPS" value={summary.mockCount} icon={AlertTriangle} color="#EF4444" sub="Potensi kecurangan" />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} style={{ color: C.textMuted }} />
          <span className="text-xs font-bold" style={{ color: C.text }}>Filter Data</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1" style={{ color: C.textMuted }}>Dari Tanggal</label>
            <input type="date" value={filters.dateFrom}
              onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value, page: 1 }))}
              className="h-8 px-2 rounded-lg text-xs outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1" style={{ color: C.textMuted }}>Sampai Tanggal</label>
            <input type="date" value={filters.dateTo}
              onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value, page: 1 }))}
              className="h-8 px-2 rounded-lg text-xs outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1" style={{ color: C.textMuted }}>Nama Siswa</label>
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: C.textMuted }} />
              <input type="text" value={filters.studentName}
                onChange={e => setFilters(p => ({ ...p, studentName: e.target.value }))}
                placeholder="Cari nama..."
                className="h-8 pl-6 pr-2 rounded-lg text-xs outline-none w-40"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1" style={{ color: C.textMuted }}>Status Mock GPS</label>
            <select value={filters.isMock}
              onChange={e => setFilters(p => ({ ...p, isMock: e.target.value, page: 1 }))}
              className="h-8 px-2 rounded-lg text-xs outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}>
              <option value="">Semua</option>
              <option value="false">GPS Asli</option>
              <option value="true">Mock GPS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
              {['Nama Siswa', 'Kelas', 'Waktu', 'Koordinat', 'Jarak', 'Status', 'Mock', 'Akurasi'].map(h => (
                <th key={h} className="px-3 py-3 text-left font-bold text-[10px] uppercase tracking-wider" style={{ color: C.textMuted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12"><Loader2 size={20} className="animate-spin inline" style={{ color: C.primary }} /></td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-xs" style={{ color: C.textMuted }}>Tidak ada data untuk filter yang dipilih</td></tr>
            ) : filteredLogs.map((log, i) => (
              <tr key={log.id}
                style={{ background: i % 2 === 0 ? C.bg : C.card, borderBottom: `1px solid ${C.border}` }}>
                <td className="px-3 py-2.5 font-semibold" style={{ color: C.text }}>{log.student?.user?.name || '—'}</td>
                <td className="px-3 py-2.5" style={{ color: C.textSub }}>{log.student?.class?.name || '—'}</td>
                <td className="px-3 py-2.5 font-mono text-[10px]" style={{ color: C.textMuted }}>{new Date(log.timestamp).toLocaleString('id-ID')}</td>
                <td className="px-3 py-2.5 font-mono text-[10px]" style={{ color: C.textSub }}>{log.lat.toFixed(5)}, {log.lng.toFixed(5)}</td>
                <td className="px-3 py-2.5 font-mono font-bold" style={{ color: log.isInside ? '#10B981' : '#EF4444' }}>{log.distance} m</td>
                <td className="px-3 py-2.5"><Pill ok={log.isInside} label={log.isInside ? 'Dalam Radius' : 'Luar Radius'} /></td>
                <td className="px-3 py-2.5"><Pill ok={!log.isMock} label={log.isMock ? 'Mock' : 'Asli'} /></td>
                <td className="px-3 py-2.5 font-mono text-[10px]" style={{ color: C.textMuted }}>{log.accuracy} m</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: C.border, background: C.card }}>
            <span className="text-xs" style={{ color: C.textMuted }}>
              {result.total} data · halaman {result.page} dari {result.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button disabled={filters.page === 1}
                onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
                className="p-1.5 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-all">
                <ChevronLeft size={14} style={{ color: C.textMuted }} />
              </button>
              <button disabled={filters.page === result.totalPages}
                onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                className="p-1.5 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-all">
                <ChevronRight size={14} style={{ color: C.textMuted }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Tab: Riwayat Perubahan ────────────────────────────────────────────────────
const TabRiwayat = ({ authToken }: { authToken: string }) => {
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/gps/geofence/history?limit=100', { headers: { Authorization: `Bearer ${authToken}` } });
        if (res.ok) setLogs(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [authToken]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-black" style={{ color: C.text }}>Riwayat Perubahan Geofence</h2>
        <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Catatan audit setiap perubahan konfigurasi titik lokasi sekolah</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin" style={{ color: C.primary }} /></div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <History size={32} style={{ color: C.textMuted }} />
          <p className="text-sm font-semibold" style={{ color: C.textMuted }}>Belum ada riwayat perubahan</p>
          <p className="text-xs" style={{ color: C.textMuted }}>Setiap perubahan konfigurasi akan tercatat di sini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, i) => (
            <motion.div key={log.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${C.primary}14` }}>
                    <MapPin size={14} style={{ color: C.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: C.text }}>
                        {log.newName || 'SMKN 1 Wonogiri'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${C.primary}14`, color: C.primary }}>
                        Diubah oleh {log.changedByName || 'Admin'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {log.prevLatitude !== undefined && (
                        <div className="p-2 rounded-lg text-[10px]" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                          <span className="font-bold block mb-0.5">Sebelum</span>
                          <span className="font-mono">{log.prevLatitude?.toFixed(5)}, {log.prevLongitude?.toFixed(5)} · r={log.prevRadius}m</span>
                        </div>
                      )}
                      <div className="p-2 rounded-lg text-[10px]" style={{ background: '#F0FDF4', color: '#15803D' }}>
                        <span className="font-bold block mb-0.5">Sesudah</span>
                        <span className="font-mono">{log.newLatitude.toFixed(5)}, {log.newLongitude.toFixed(5)} · r={log.newRadius}m</span>
                      </div>
                    </div>
                    {log.reason && (
                      <p className="mt-2 text-xs italic" style={{ color: C.textMuted }}>
                        Alasan: {log.reason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-mono" style={{ color: C.textMuted }}>
                    {new Date(log.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: C.textMuted }}>
                    {new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Tab: Arsip & Ekspor ───────────────────────────────────────────────────────
const TabArsip = ({ authToken }: { authToken: string }) => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [config, setConfig] = useState<GeofenceConfig | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/gps/reports/summary', { headers: { Authorization: `Bearer ${authToken}` } }).then(r => r.ok ? r.json() : null),
      fetch('/api/gps/geofence', { headers: { Authorization: `Bearer ${authToken}` } }).then(r => r.ok ? r.json() : null),
    ]).then(([s, c]) => { if (s) setSummary(s); if (c) setConfig(c); });
  }, [authToken]);

  const doExport = async (period: 'today' | 'week' | 'month' | 'all', label: string) => {
    setExporting(period);
    const now = new Date();
    let dateFrom = '';
    const dateTo = now.toISOString().slice(0, 10);
    if (period === 'today') dateFrom = dateTo;
    else if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); dateFrom = d.toISOString().slice(0, 10); }
    else if (period === 'month') { const d = new Date(now); d.setDate(d.getDate() - 30); dateFrom = d.toISOString().slice(0, 10); }

    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (period !== 'all') params.set('dateTo', dateTo);
      const res = await fetch(`/api/gps/reports/export?${params}`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan-gps-${label.toLowerCase().replace(/\s/g, '-')}-${dateTo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(null);
    }
  };

  const exportOptions = [
    { period: 'today' as const, label: 'Hari Ini', icon: Clock, color: '#6366f1', desc: 'Log GPS absensi hari ini' },
    { period: 'week' as const, label: '7 Hari Terakhir', icon: TrendingUp, color: C.primary, desc: 'Log 7 hari ke belakang' },
    { period: 'month' as const, label: '30 Hari Terakhir', icon: BarChart3, color: '#0ea5e9', desc: 'Log 30 hari ke belakang' },
    { period: 'all' as const, label: 'Semua Data', icon: Archive, color: '#10B981', desc: 'Seluruh riwayat log GPS' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-black" style={{ color: C.text }}>Arsip & Ekspor Data GPS</h2>
        <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Unduh laporan integritas GPS dalam format CSV untuk arsip dan analisis lanjutan</p>
      </div>

      {/* Config Info Banner */}
      {config && (
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: `${C.primary}0c`, border: `1px solid ${C.primary}25` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${C.primary}14` }}>
            <Target size={18} style={{ color: C.primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: C.text }}>Geofence Aktif: {config.name}</p>
            <p className="text-xs mt-0.5 font-mono" style={{ color: C.textMuted }}>
              {config.latitude.toFixed(5)}, {config.longitude.toFixed(5)} · Radius {config.radiusMeters} m
            </p>
          </div>
          <Pill ok={config.isActive} label={config.isActive ? 'Aktif' : 'Nonaktif'} />
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Log GPS" value={summary.total.toLocaleString()} icon={FileText} color="#6366f1" sub="Semua waktu" />
          <StatCard label="GPS Valid" value={summary.validCount.toLocaleString()} icon={CheckCircle2} color="#10B981" sub={`${summary.integrityRate}% integritas`} />
          <StatCard label="Dalam Radius" value={summary.insideGeofenceCount.toLocaleString()} icon={Target} color={C.primary} sub={`${summary.geofenceComplianceRate}% kepatuhan`} />
          <StatCard label="Mock GPS" value={summary.mockCount.toLocaleString()} icon={AlertTriangle} color="#EF4444" sub="Terdeteksi" />
        </div>
      )}

      {/* Export Cards */}
      <div>
        <p className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: C.text }}>
          <Download size={15} style={{ color: C.primary }} />
          Pilihan Ekspor
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {exportOptions.map(opt => {
            const Icon = opt.icon;
            const isLoading = exporting === opt.period;
            return (
              <motion.button key={opt.period} whileTap={{ scale: 0.98 }}
                onClick={() => doExport(opt.period, opt.label)}
                disabled={exporting !== null}
                className="flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:shadow-sm disabled:opacity-60"
                style={{ background: C.card, border: `1px solid ${C.border}` }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = opt.color + '50'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${opt.color}14` }}>
                  {isLoading ? <Loader2 size={18} className="animate-spin" style={{ color: opt.color }} /> : <Icon size={18} style={{ color: opt.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: C.text }}>{opt.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>{opt.desc}</p>
                </div>
                <Download size={14} style={{ color: C.textMuted }} />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
        <Info size={15} style={{ color: '#F59E0B' }} className="flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1" style={{ color: '#92400E' }}>
          <p className="font-bold">Format Ekspor CSV</p>
          <p>File CSV kompatibel dengan Microsoft Excel dan Google Sheets. Kolom mencakup: nama siswa, kelas, waktu, koordinat, jarak ke sekolah, status dalam/luar radius, dan deteksi mock GPS.</p>
          <p>BOM UTF-8 disertakan untuk kompatibilitas karakter Indonesia di Excel.</p>
        </div>
      </div>
    </div>
  );
};

// ── Main GeofenceModule ────────────────────────────────────────────────────────
type Tab = 'konfigurasi' | 'laporan' | 'riwayat' | 'arsip';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'konfigurasi', label: 'Konfigurasi', icon: Target },
  { id: 'laporan', label: 'Laporan Integritas', icon: Shield },
  { id: 'riwayat', label: 'Riwayat Perubahan', icon: History },
  { id: 'arsip', label: 'Arsip & Ekspor', icon: Archive },
];

export default function GeofenceModule({ authToken, userRole }: { authToken: string; userRole?: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('konfigurasi');
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'TU';

  return (
    <div className="flex flex-col min-h-0" style={{ background: C.bg }}>
      {/* Page Header */}
      <div className="px-6 pt-6 pb-0 flex-shrink-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${C.primary}14` }}>
            <MapPin size={18} style={{ color: C.primary }} />
          </div>
          <div>
            <h1 className="text-xl font-black" style={{ color: C.text }}>Geofence GPS</h1>
            <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>
              Manajemen titik lokasi, radius kehadiran, dan laporan integritas GPS — SMKN 1 Wonogiri
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b" style={{ borderColor: C.border }}>
          {TABS.map(tab => {
            if (tab.id === 'konfigurasi' && !isSuperAdmin) return null;
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all relative whitespace-nowrap"
                style={{ color: active ? C.primary : C.textMuted }}>
                <Icon size={13} />
                {tab.label}
                {active && (
                  <motion.div layoutId="geofence-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: C.primary }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}>
            {activeTab === 'konfigurasi' && <TabKonfigurasi authToken={authToken} />}
            {activeTab === 'laporan' && <TabLaporan authToken={authToken} />}
            {activeTab === 'riwayat' && <TabRiwayat authToken={authToken} />}
            {activeTab === 'arsip' && <TabArsip authToken={authToken} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
