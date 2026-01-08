import React, { useState } from 'react';

function BasicSettings() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: '일반 설정' },
    // { id: 'investment', label: '투자지표' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">기본설정</h1>
        <p className="text-wealth-muted">애플리케이션의 기본 설정을 관리합니다.</p>
      </div>

      <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800">
        {/* 탭 헤더 */}
        <div className="border-b border-gray-800">
          <nav className="flex space-x-1 px-6 pt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-wealth-gold border-wealth-gold'
                    : 'text-wealth-muted border-transparent hover:text-white hover:border-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="p-6 space-y-6">
          {activeTab === 'general' && (
            <>
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">일반 설정</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-wealth-muted mb-2">
                      언어 설정
                    </label>
                    <select className="w-full px-4 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold">
                      <option value="ko">한국어</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-wealth-muted mb-2">
                      테마 설정
                    </label>
                    <select className="w-full px-4 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold">
                      <option value="dark">다크 모드</option>
                      <option value="light">라이트 모드</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="pt-4 border-t border-gray-800">
                <h2 className="text-xl font-semibold text-white mb-4">알림 설정</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-white">이메일 알림</label>
                      <p className="text-sm text-wealth-muted">이메일 알림을 받습니다</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-wealth-gold/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-wealth-gold"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-white">푸시 알림</label>
                      <p className="text-sm text-wealth-muted">브라우저 푸시 알림을 받습니다</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-wealth-gold/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-wealth-gold"></div>
                    </label>
                  </div>
                </div>
              </section>

              <section className="pt-4 border-t border-gray-800">
                <h2 className="text-xl font-semibold text-white mb-4">데이터 설정</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-wealth-muted mb-2">
                      자동 저장 주기
                    </label>
                    <select className="w-full px-4 py-2 bg-wealth-card border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-wealth-gold">
                      <option value="1">1분</option>
                      <option value="5">5분</option>
                      <option value="10">10분</option>
                      <option value="30">30분</option>
                    </select>
                  </div>
                </div>
              </section>

              <div className="pt-4 border-t border-gray-800">
                <button className="px-6 py-2 bg-gradient-to-r from-wealth-gold to-yellow-600 text-white font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200">
                  설정 저장
                </button>
              </div>
            </>
          )}

          {activeTab === 'investment' && (
            <>
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">투자지표 설정</h2>
                <div className="space-y-4">
                  <p className="text-wealth-muted">투자지표 관련 설정이 여기에 표시됩니다.</p>
                  {/* 투자지표 설정 내용 추가 예정 */}
                </div>
              </section>

              <div className="pt-4 border-t border-gray-800">
                <button className="px-6 py-2 bg-gradient-to-r from-wealth-gold to-yellow-600 text-white font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200">
                  설정 저장
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BasicSettings;

