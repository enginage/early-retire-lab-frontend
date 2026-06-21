import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getStocksRestApiUrl, API_ENDPOINTS } from '../../utils/api';

const PUBLIC_API_BASE = getStocksRestApiUrl(API_ENDPOINTS.MARKET_OVERVIEW_PUBLIC);

/** API/FullCalendar 날짜를 YYYY-MM-DD로 통일 */
function normalizeDateStr(value) {
  if (!value) return '';
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export default function ComprehensiveCalendar() {
  const [calendarDates, setCalendarDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCalendarDates();
  }, []);

  const loadCalendarDates = async () => {
    try {
      const res = await fetch(`${PUBLIC_API_BASE}/calendar`);
      if (!res.ok) throw new Error('달력 데이터를 불러오는데 실패했습니다.');
      const data = await res.json();
      const normalized = (Array.isArray(data) ? data : []).map(normalizeDateStr).filter(Boolean);
      setCalendarDates(normalized);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateClick = useCallback(async (arg) => {
    const dateStr = normalizeDateStr(arg.dateStr);
    setSelectedDate(dateStr);
    setDailyData(null);
    setError(null);

    try {
      setLoading(true);
      const res = await fetch(`${PUBLIC_API_BASE}/daily/${dateStr}`);
      if (!res.ok) {
        if (res.status === 404) {
          setDailyData(null);
        } else {
          const errText = await res.text();
          throw new Error(`시황 데이터를 불러오는데 실패했습니다. (${res.status}) ${errText}`);
        }
      } else {
        const data = await res.json();
        setDailyData(data);
      }
    } catch (err) {
      setError(err.message);
      setDailyData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Build FullCalendar events
  const events = calendarDates.map((dateStr) => ({
    start: dateStr,
    allDay: true,
    display: 'background',
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  }));

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full p-4 overflow-y-auto">
      {/* 좌측: 캘린더 */}
      <div className="w-full md:w-1/2 lg:w-2/5 bg-wealth-card border border-gray-800 rounded-xl p-4 shadow-xl">
        <h2 className="text-xl font-bold text-wealth-gold mb-4">종합캘린더</h2>
        <style dangerouslySetContent={{ __html: `
          .fc-theme-standard td, .fc-theme-standard th { border-color: #374151; }
          .fc-day-today { background-color: rgba(55, 65, 81, 0.5) !important; }
          .fc-daygrid-day:hover { cursor: pointer; background-color: rgba(75, 85, 99, 0.4); }
          .fc .fc-button-primary { background-color: #1f2937; border-color: #374151; color: #d1d5db; }
          .fc .fc-button-primary:hover { background-color: #374151; border-color: #4b5563; }
          .fc .fc-button-primary:disabled { background-color: #111827; border-color: #374151; }
          .fc .fc-daygrid-day-number { color: #d1d5db; text-decoration: none; padding: 4px; }
          .fc .fc-col-header-cell-cushion { color: #9ca3af; text-decoration: none; padding: 8px 4px; }
        `}} />
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          dateClick={handleDateClick}
          height="auto"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          dayMaxEvents={true}
        />
      </div>

      {/* 우측: 상세 데이터 패널 */}
      <div className="w-full md:w-1/2 lg:w-3/5 bg-wealth-card border border-gray-800 rounded-xl p-6 shadow-xl overflow-y-auto">
        {selectedDate ? (
          <>
            <h2 className="text-2xl font-bold text-white mb-6 border-b border-gray-700 pb-2">
              {selectedDate} <span className="text-wealth-muted text-lg font-normal ml-2">시황 분석</span>
            </h2>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wealth-gold"></div>
              </div>
            ) : error ? (
              <div className="text-red-400 p-4 bg-red-900/20 rounded-lg border border-red-500/30">
                {error}
              </div>
            ) : !dailyData ? (
              <div className="flex flex-col items-center justify-center h-48 text-wealth-muted">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <p>해당 일자의 분석 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. 종합시황 */}
                <div>
                  <h3 className="text-lg font-semibold text-wealth-gold mb-3 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-wealth-gold mr-2"></span>
                    종합시황
                  </h3>
                  <div className="bg-gray-800/40 rounded-lg p-4 text-gray-300 whitespace-pre-wrap leading-relaxed border border-gray-700/50">
                    {dailyData.market_info || '등록된 시황 정보가 없습니다.'}
                  </div>
                </div>

                {/* 2. 테마별 상세 (테마 + 소속 종목 묶어서 표시) */}
                <div>
                  <h3 className="text-lg font-semibold text-wealth-gold mb-4 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-wealth-gold mr-2"></span>
                    상승테마 및 주도주
                  </h3>
                  
                  {dailyData.themes && dailyData.themes.length > 0 ? (
                    <div className="space-y-6">
                      {dailyData.themes.map((theme, tIdx) => (
                        <div key={theme.id} className="bg-gray-800/30 border border-gray-700/50 rounded-lg overflow-hidden">
                          {/* 테마 헤더 */}
                          <div className="bg-gray-800/60 px-4 py-3 border-b border-gray-700/50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <h4 className="text-md font-medium text-white">
                                {theme.theme_name || '-'}
                                {theme.category_name && <span className="ml-2 text-sm text-wealth-muted">({theme.category_name})</span>}
                              </h4>
                            </div>
                            {theme.theme_info && (
                              <p className="mt-2 text-sm text-gray-400 whitespace-pre-wrap">{theme.theme_info}</p>
                            )}
                          </div>
                          
                          {/* 소속 종목 테이블 */}
                          {theme.stocks && theme.stocks.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                <thead>
                                  <tr className="bg-gray-800/40 text-gray-400 border-b border-gray-700/50">
                                    <th className="px-4 py-2 font-medium w-16 text-center">순서</th>
                                    <th className="px-4 py-2 font-medium w-48">종목명 (코드)</th>
                                    <th className="px-4 py-2 font-medium">상승/급등 사유 (비고)</th>
                                    <th className="px-4 py-2 font-medium w-20 text-center">상한가</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {theme.stocks.map((stock) => (
                                    <tr key={stock.id} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                                      <td className="px-4 py-2 text-center text-gray-500">{stock.capital_order || '-'}</td>
                                      <td className="px-4 py-2">
                                        <span className="text-white">{stock.stock_name || '-'}</span>
                                        <span className="text-xs text-gray-500 ml-1">({stock.stock_ticker || '-'})</span>
                                        {stock.nxt_yn && <span className="ml-1 text-[10px] px-1 py-0.5 bg-green-900/30 text-green-400 border border-green-800/50 rounded">NXT</span>}
                                      </td>
                                      <td className="px-4 py-2 text-gray-400 whitespace-pre-wrap">{stock.remark || '-'}</td>
                                      <td className="px-4 py-2 text-center">
                                        {stock.is_surge_limit ? (
                                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-900/30 text-red-400 font-bold text-xs">상</span>
                                        ) : (
                                          <span className="text-gray-600">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 italic">등록된 종목이 없습니다.</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">상승테마가 없습니다.</p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-wealth-muted pt-20">
            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <p className="text-lg">왼쪽 캘린더에서 날짜를 선택하세요.</p>
            <p className="text-sm mt-2">금색으로 표시된 날짜에 분석 데이터가 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
