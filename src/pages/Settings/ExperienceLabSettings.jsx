import React, { useState, useEffect } from 'react';

import { getApiUrl, API_ENDPOINTS } from '../../utils/api';

const MASTER_API_BASE_URL = getApiUrl(API_ENDPOINTS.COMMON_CODE_MASTERS);
const DETAIL_API_BASE_URL = getApiUrl(API_ENDPOINTS.COMMON_CODE_DETAILS);

function ExperienceLabSettings() {
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadExperienceServiceDetails();
  }, []);

  useEffect(() => {
    if (tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const loadExperienceServiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 먼저 마스터 코드로 마스터 ID 찾기
      const masterResponse = await fetch(`${MASTER_API_BASE_URL}?skip=0&limit=100`);
      if (!masterResponse.ok) {
        throw new Error('마스터 코드를 불러오는데 실패했습니다.');
      }
      const masters = await masterResponse.json();
      const master = masters.find(m => m.code === 'experience_service');
      
      if (!master) {
        setError('experience_service 마스터 코드를 찾을 수 없습니다.');
        setTabs([]);
        return;
      }
      
      // 마스터 ID로 상세 코드 조회
      const detailResponse = await fetch(`${DETAIL_API_BASE_URL}?master_id=${master.id}`);
      if (detailResponse.ok) {
        const details = await detailResponse.json();
        const tabList = details.map(detail => ({
          id: detail.detail_code,
          label: detail.detail_code_name
        }));
        setTabs(tabList);
        if (tabList.length > 0) {
          setActiveTab(tabList[0].id);
        }
      } else {
        throw new Error('상세 코드를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError(err.message);
      console.error(err);
      setTabs([]);
    } finally {
      setLoading(false);
    }
  };


  const renderTabContent = () => {
    if (!activeTab) return null;

    const activeTabData = tabs.find(tab => tab.id === activeTab);
    if (!activeTabData) return null;

    return (
      <>
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">{activeTabData.label} 설정</h2>
          <div className="mt-6 text-wealth-muted">
            설정 기능이 준비 중입니다.
          </div>
        </section>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">체험실 설정</h1>
        <p className="text-wealth-muted">체험실 기능의 설정을 관리합니다.</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wealth-gold"></div>
            <span className="ml-3 text-wealth-muted">로딩 중...</span>
          </div>
        </div>
      ) : tabs.length === 0 ? (
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 p-6">
          <div className="text-center py-8 text-wealth-muted">
            등록된 체험실 서비스가 없습니다.
          </div>
        </div>
      ) : (
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800">
          {/* 탭 헤더 */}
          <div className="border-b border-gray-800">
            <nav className="flex space-x-1 px-6 pt-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
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
            {renderTabContent()}
          </div>
        </div>
      )}
    </div>
  );
}

export default ExperienceLabSettings;

