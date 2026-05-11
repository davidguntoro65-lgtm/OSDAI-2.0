import { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, MapPin, User, RefreshCcw } from 'lucide-react';

const C = { primary: '#FF6A00', bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', text: '#111827', textMuted: '#6B7280', textSub: '#374151' };

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const PERIODS = Array.from({ length: 10 }, (_, i) => i + 1);
const PERIOD_TIMES: Record<number, string> = {
  1: '07:00', 2: '07:45', 3: '08:30', 4: '09:15', 5: '10:15',
  6: '11:00', 7: '11:45', 8: '12:30', 9: '13:15', 10: '14:00'
};

export default function GuruJadwal({ authToken }: { authToken: string }) {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayInfo, setTodayInfo] = useState<any>(null);
  const headers = { Authorization: `Bearer ${authToken}` };

  // day mapping: JS getDay() 0=Sun,1=Mon..6=Sat → DB 1=Mon..7=Sun
  const jsDay = new Date().getDay();
  const today = jsDay === 0 ? 7 : jsDay;

  useEffect(() => { fetchAll(); }, [authToken]);

  const fetchAll = async () => {
    setLoading(true);
    const [allRes, todayRes] = await Promise.allSettled([
      fetch('/api/timetable/guru/my-schedule', { headers }),
      fetch('/api/intelligence/today-schedule', { headers }),
    ]);
    if (allRes.status === 'fulfilled' && allRes.value.ok) setSchedule(await allRes.value.json());
    if (todayRes.status === 'fulfilled' && todayRes.value.ok) setTodayInfo(await todayRes.value.json());
    setLoading(false);
  };

  // Build grid: day → period → lesson
  const grid: Record<number, Record<number, any>> = {};
  DAYS.forEach((_, i) => { grid[i + 1] = {}; });
  schedule.forEach(s => {
    for (let p = s.periodStart; p <= s.periodEnd; p++) {
      grid[s.day] = grid[s.day] || {};
      grid[s.day][p] = s;
    }
  });

  // Today's lessons
  const todayLessons = schedule.filter(s => s.day === today).sort((a, b) => a.periodStart - b.periodStart);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Jadwal Mengajar</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Jadwal mengajar mingguan</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border hover:bg-gray-50" style={{ borderColor: C.border, color: C.textMuted }}>
          <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Today highlight */}
      <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: '#FFF4ED', color: C.primary }}>Hari Ini</div>
          <p className="text-sm font-bold" style={{ color: C.text }}>
            {DAYS[today - 1] || 'Hari ini'} — {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {todayInfo?.currentPeriod && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#F0FDF4', color: '#15803D' }}>
              Jam ke-{todayInfo.currentPeriod} · {todayInfo.periodTime}
            </span>
          )}
        </div>
        {todayLessons.length === 0 ? (
          <p className="text-xs" style={{ color: C.textMuted }}>Tidak ada jadwal mengajar hari ini.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayLessons.map((s, i) => (
              <div key={i} className="p-3 rounded-xl" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock size={11} style={{ color: C.primary }} />
                  <span className="text-[10px] font-bold" style={{ color: C.primary }}>Jam {s.periodStart}–{s.periodEnd} · {PERIOD_TIMES[s.periodStart]}</span>
                </div>
                <p className="text-sm font-black" style={{ color: C.text }}>{s.subject?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: C.textMuted }}><BookOpen size={10} />{s.class?.name}</span>
                  {s.room && <span className="flex items-center gap-1 text-[10px]" style={{ color: C.textMuted }}><MapPin size={10} />{s.room?.name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly grid */}
      <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>Jadwal Mingguan</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: C.bg }}>
                  <th className="px-3 py-2.5 text-left font-bold w-16" style={{ color: C.textMuted }}>Jam</th>
                  {DAYS.map((d, i) => (
                    <th key={d} className="px-3 py-2.5 text-center font-bold" style={{ color: i + 1 === today ? C.primary : C.textMuted, background: i + 1 === today ? '#FFF4ED' : undefined }}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(p => (
                  <tr key={p} className="border-t" style={{ borderColor: '#F3F4F6' }}>
                    <td className="px-3 py-2 text-center" style={{ color: C.textMuted }}>
                      <div className="font-bold">{p}</div>
                      <div className="text-[9px]">{PERIOD_TIMES[p]}</div>
                    </td>
                    {DAYS.map((_, di) => {
                      const day = di + 1;
                      const lesson = grid[day]?.[p];
                      const isToday = day === today;
                      return (
                        <td key={di} className="px-1 py-1 text-center" style={{ background: isToday ? '#FFFBF5' : undefined }}>
                          {lesson && lesson.periodStart === p ? (
                            <div className="px-2 py-1.5 rounded-lg text-left" style={{ background: '#FFF4ED', border: '1px solid #FED7AA' }}>
                              <p className="text-[10px] font-black truncate" style={{ color: C.primary }}>{lesson.subject?.name}</p>
                              <p className="text-[9px] truncate" style={{ color: C.textMuted }}>{lesson.class?.name}</p>
                            </div>
                          ) : lesson && lesson.periodStart < p ? (
                            <div className="h-8 rounded-lg" style={{ background: '#FFF4ED20' }} />
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && schedule.length === 0 && (
          <div className="flex flex-col items-center py-12" style={{ color: C.textMuted }}>
            <Calendar size={32} style={{ opacity: 0.3 }} />
            <p className="text-sm mt-2">Belum ada jadwal mengajar</p>
          </div>
        )}
      </div>
    </div>
  );
}
