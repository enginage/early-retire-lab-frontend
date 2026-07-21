import React from 'react';
import { useLocation } from 'react-router-dom';
import KakaoAdFit from '../components/KakaoAdFit';
import {
  shouldAdjustContentForSidebar,
  shouldShowKakaoAdFit,
  shouldShowKakaoAdFitSidebar,
} from '../config/adFit';

const ContentFrame = ({ children }) => {
  const location = useLocation();
  const showAd = shouldShowKakaoAdFit(location.pathname);
  const showSidebar = shouldShowKakaoAdFitSidebar(location.pathname);
  const adjustContent = shouldAdjustContentForSidebar(location);
  const adKey = `${location.pathname}${location.search}`;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-wealth-dark">
      <div className="max-w-[95%] mx-auto px-6 py-8 relative">
        {showAd && <KakaoAdFit slot="top" key={`top-${adKey}`} />}

        {showSidebar && adjustContent ? (
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
            <div className="flex-1 min-w-0">{children}</div>
            <KakaoAdFit slot="sidebar" key={`sidebar-${adKey}`} />
          </div>
        ) : showSidebar ? (
          <>
            {children}
            <div className="hidden lg:block absolute top-8 right-6 w-[160px]">
              <KakaoAdFit slot="sidebar" key={`sidebar-${adKey}`} />
            </div>
          </>
        ) : (
          children
        )}
      </div>
    </main>
  );
};

export default ContentFrame;
