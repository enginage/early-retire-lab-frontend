import React from 'react';
import { useLocation } from 'react-router-dom';
import TopNav from './TopNav';
import ContentFrame from './ContentFrame';
import Footer from './Footer';
import KakaoAdFit from '../components/KakaoAdFit';
import { shouldShowKakaoAdFit } from '../config/adFit';

const AppLayout = ({
  children,
}) => {
  const location = useLocation();
  const showAd = shouldShowKakaoAdFit(location.pathname);
  const adKey = `${location.pathname}${location.search}`;

  return (
    <div className="min-h-screen bg-wealth-dark flex flex-col">
      <TopNav />

      <div className="flex-1 min-h-0 flex flex-col">
        <ContentFrame>
          {children}
        </ContentFrame>
        {showAd && (
          <div className="max-w-[95%] mx-auto px-6 w-full">
            <KakaoAdFit slot="footer" key={`footer-${adKey}`} />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AppLayout;
