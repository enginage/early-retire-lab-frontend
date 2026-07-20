import React, { useEffect, useRef } from 'react';
import {
  KAKAO_ADFIT_BANNER,
  KAKAO_ADFIT_ONFAIL_CALLBACK,
  KAKAO_ADFIT_SCRIPT_URL,
} from '../config/adFit';

const SCRIPT_ID = 'kakao-adfit-ba-script';

function loadScriptAfterIns(ins) {
  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    existing.remove();
  }

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.type = 'text/javascript';
  script.charset = 'utf-8';
  script.src = KAKAO_ADFIT_SCRIPT_URL;
  ins.insertAdjacentElement('afterend', script);
}

if (typeof window !== 'undefined' && !window[KAKAO_ADFIT_ONFAIL_CALLBACK]) {
  window[KAKAO_ADFIT_ONFAIL_CALLBACK] = (insEl) => {
    if (insEl) {
      insEl.style.display = 'none';
    }
    const wrapper = insEl?.closest('[data-adfit-wrapper]');
    if (wrapper) {
      wrapper.style.display = 'none';
    }
  };
}

export default function KakaoAdFit() {
  const insRef = useRef(null);

  useEffect(() => {
    const ins = insRef.current;
    if (!ins) return undefined;

    loadScriptAfterIns(ins);

    return () => {
      const script = document.getElementById(SCRIPT_ID);
      if (script) {
        script.remove();
      }
    };
  }, []);

  return (
    <div
      data-adfit-wrapper
      className="flex justify-center overflow-x-auto mb-4 min-h-[90px]"
      aria-label="광고"
    >
      <ins
        ref={insRef}
        className="kakao_ad_area"
        style={{ display: 'none', width: '100%' }}
        data-ad-unit={KAKAO_ADFIT_BANNER.unit}
        data-ad-width={KAKAO_ADFIT_BANNER.width}
        data-ad-height={KAKAO_ADFIT_BANNER.height}
        data-ad-onfail={KAKAO_ADFIT_ONFAIL_CALLBACK}
      />
    </div>
  );
}
