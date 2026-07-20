import React from 'react';
import { useLocation } from 'react-router-dom';
import KakaoAdFit from '../components/KakaoAdFit';
import { shouldShowKakaoAdFit } from '../config/adFit';

const ContentFrame = ({ children }) => {
  const location = useLocation();
  const showAd = shouldShowKakaoAdFit(location.pathname);
  const adKey = `${location.pathname}${location.search}`;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-wealth-dark">
      <div className="max-w-[95%] mx-auto px-6 py-8">
        {showAd && <KakaoAdFit key={adKey} />}
        {children}
      </div>
    </main>
  );
};

export default ContentFrame;
