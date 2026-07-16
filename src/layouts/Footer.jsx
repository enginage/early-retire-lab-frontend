import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="shrink-0 border-t border-gray-800 bg-wealth-card/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 text-center space-y-2">
        <p className="text-xs sm:text-sm text-wealth-muted leading-relaxed">
          본 사이트는 투자 정보 제공을 목적으로 하며, 특정 종목의 매수·매도를 권유하지 않습니다.<br/>
          본 사이트에서 제공된 정보에 의한 투자 결과에 정보 제공자는 어떠한 법적 책임도 지지 않습니다.
        </p>
        <p className="text-xs text-wealth-muted">
          <Link to="/privacy" className="text-wealth-gold hover:underline">
            개인정보처리방침
          </Link>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
