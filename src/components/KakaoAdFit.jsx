import React, { useEffect, useRef } from 'react';
import {
  KAKAO_ADFIT_ONFAIL_CALLBACK_FOOTER,
  KAKAO_ADFIT_ONFAIL_CALLBACK_SIDEBAR,
  KAKAO_ADFIT_ONFAIL_CALLBACK_TOP,
  KAKAO_ADFIT_SCRIPT_URL,
  getKakaoAdFitBanner,
  getKakaoAdFitOnFailCallback,
} from '../config/adFit';

function registerOnFailCallback(callbackName) {
  if (typeof window === 'undefined' || window[callbackName]) return;

  window[callbackName] = (insEl) => {
    if (insEl) {
      insEl.style.display = 'none';
    }
    const wrapper = insEl?.closest('[data-adfit-wrapper]');
    if (wrapper) {
      wrapper.style.display = 'none';
    }
  };
}

registerOnFailCallback(KAKAO_ADFIT_ONFAIL_CALLBACK_TOP);
registerOnFailCallback(KAKAO_ADFIT_ONFAIL_CALLBACK_FOOTER);
registerOnFailCallback(KAKAO_ADFIT_ONFAIL_CALLBACK_SIDEBAR);

/** @param {{ slot?: 'top' | 'footer' | 'sidebar' }} props */
export default function KakaoAdFit({ slot = 'top' }) {
  const insRef = useRef(null);
  const banner = getKakaoAdFitBanner(slot);
  const onFailCallback = getKakaoAdFitOnFailCallback(slot);

  let wrapperClassName = 'flex justify-center overflow-x-auto mb-4 min-h-[90px]';
  if (slot === 'footer') {
    wrapperClassName = 'flex justify-center overflow-x-auto mt-6 mb-4 min-h-[90px]';
  } else if (slot === 'sidebar') {
    wrapperClassName =
      'hidden lg:flex justify-center w-[160px] shrink-0 min-h-[600px] sticky top-4 self-start';
  }

  useEffect(() => {
    const ins = insRef.current;
    if (!ins) return undefined;

    const script = document.createElement('script');
    script.async = true;
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.src = KAKAO_ADFIT_SCRIPT_URL;
    ins.insertAdjacentElement('afterend', script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <div
      data-adfit-wrapper
      className={wrapperClassName}
      aria-label="광고"
    >
      <ins
        ref={insRef}
        className="kakao_ad_area"
        style={{ display: 'none', width: '100%' }}
        data-ad-unit={banner.unit}
        data-ad-width={banner.width}
        data-ad-height={banner.height}
        data-ad-onfail={onFailCallback}
      />
    </div>
  );
}
