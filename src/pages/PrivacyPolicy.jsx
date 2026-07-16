import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import PageSeo from '../components/PageSeo';
import { getPageSeo } from '../config/publicTools';
import {
  SITE_DOMAIN,
  LEGAL_CONTACT_EMAIL,
  PRIVACY_POLICY_EFFECTIVE_DATE,
} from '../config/siteLegal';

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="space-y-3 text-wealth-muted leading-relaxed">{children}</div>
    </section>
  );
}

function PrivacyPolicy() {
  const seo = getPageSeo('privacy');

  return (
    <AppLayout>
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonicalPath={seo.path}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">개인정보처리방침</h1>
          <p className="text-sm text-wealth-muted">
            시행일: {PRIVACY_POLICY_EFFECTIVE_DATE} ·{' '}
            <Link to="/" className="text-wealth-gold hover:underline">
              {SITE_DOMAIN}
            </Link>
          </p>
        </header>

        <div className="space-y-10 bg-wealth-card/50 backdrop-blur-sm rounded-2xl p-8 md:p-10 border border-gray-800">
          <p className="text-wealth-muted leading-relaxed">
            조기은퇴주식연구소(이하 &quot;사이트&quot;)는 이용자의 개인정보를 중요하게 생각하며,
            「개인정보 보호법」 등 관련 법령을 준수합니다. 본 방침은{' '}
            <strong className="text-white">https://{SITE_DOMAIN}</strong> 서비스에 적용됩니다.
          </p>

          <Section title="1. 수집하는 개인정보 항목 및 방법">
            <p>
              <strong className="text-white">회원 가입·로그인(Supabase 인증)</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>필수: 이메일 주소, 비밀번호(암호화 저장)</li>
              <li>자동: 세션·인증 토큰, 접속 일시</li>
            </ul>
            <p>
              <strong className="text-white">서비스 이용(워크스페이스·시뮬레이션 등)</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원이 입력·저장하는 재무·투자 관련 데이터(자산, 지출, 시뮬레이션 입력값 등)</li>
            </ul>
            <p>
              <strong className="text-white">자동 수집</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>접속 IP, 브라우저·기기 정보, 쿠키(광고·분석 목적 포함)</li>
              <li>Cloudflare·호스팅 인프라를 통한 접속 로그</li>
            </ul>
          </Section>

          <Section title="2. 개인정보의 처리 목적">
            <ul className="list-disc pl-5 space-y-1">
              <li>회원 식별, 로그인·비밀번호 재설정 등 인증 서비스 제공</li>
              <li>조기은퇴 시뮬레이션, 스크리너 등 서비스 기능 제공 및 데이터 저장</li>
              <li>서비스 개선, 오류 대응, 보안·부정 이용 방지</li>
              <li>Google AdSense를 통한 맞춤·비맞춤 광고 게재 및 광고 성과 측정</li>
            </ul>
          </Section>

          <Section title="3. 보유 및 이용 기간">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                회원 정보: 회원 탈퇴 시까지. 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안
                보관
              </li>
              <li>접속 로그: 통상 3개월 이내(호스팅·CDN 정책에 따름)</li>
              <li>광고 쿠키: Google 정책 및 이용자 브라우저 설정에 따름</li>
            </ul>
          </Section>

          <Section title="4. 개인정보의 제3자 제공">
            <p>
              사이트는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 아래
              경우에는 예외로 합니다.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령에 따른 요청이 있는 경우</li>
            </ul>
          </Section>

          <Section title="5. 개인정보 처리 위탁 및 국외 이전">
            <p>서비스 운영을 위해 아래 업체에 처리를 위탁할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-white">Supabase Inc.</strong> — 회원 인증(이메일·비밀번호
                관리). 서버는 이용자와 다른 국가에 위치할 수 있습니다.
              </li>
              <li>
                <strong className="text-white">Google LLC (AdSense)</strong> — 광고 게재·쿠키 기반
                광고 식별.{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-wealth-gold hover:underline"
                >
                  Google 개인정보처리방침
                </a>
              </li>
              <li>
                <strong className="text-white">Cloudflare, Inc.</strong> — CDN·보안·호스팅
              </li>
            </ul>
          </Section>

          <Section title="6. 쿠키 및 Google AdSense">
            <p>
              사이트는 Google AdSense(게시자 ID: pub-8772739102245184)를 사용하여 광고를
              게재합니다. Google 및 제3자 공급업체는 쿠키를 사용하여 이용자의 관심사에 기반한
              광고를 표시하거나, 다른 웹사이트 방문 기록을 바탕으로 광고를 게재할 수 있습니다.
            </p>
            <p>
              Google의 광고 쿠키 사용에 대한 자세한 내용은{' '}
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-wealth-gold hover:underline"
              >
                Google 광고 정책
              </a>
              을 참고하세요.
            </p>
            <p>
              이용자는{' '}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-wealth-gold hover:underline"
              >
                Google 광고 설정
              </a>
              에서 맞춤 광고를 끌 수 있습니다. 브라우저 설정에서 쿠키 저장을 거부할 수 있으나,
              일부 서비스 이용에 제한이 있을 수 있습니다.
            </p>
          </Section>

          <Section title="7. 이용자의 권리">
            <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>개인정보 열람·정정·삭제·처리 정지 요청</li>
              <li>회원 탈퇴(계정 삭제) 요청</li>
            </ul>
            <p>
              요청은 아래 연락처로 하실 수 있으며, 지체 없이 조치하겠습니다.
            </p>
          </Section>

          <Section title="8. 개인정보 보호책임자">
            <ul className="list-none space-y-1">
              <li>
                <strong className="text-white">담당:</strong> 조기은퇴주식연구소 운영자
              </li>
              <li>
                <strong className="text-white">이메일:</strong>{' '}
                <a
                  href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                  className="text-wealth-gold hover:underline"
                >
                  {LEGAL_CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </Section>

          <Section title="9. 투자 정보에 관한 안내">
            <p>
              본 사이트는 투자 참고 정보 및 시뮬레이션 도구를 제공하며, 특정 종목의 매수·매도를
              권유하지 않습니다. 제공 정보에 따른 투자 결과에 대해 운영자는 법적 책임을 지지
              않습니다.
            </p>
          </Section>

          <Section title="10. 방침의 변경">
            <p>
              본 방침은 법령·서비스 변경에 따라 수정될 수 있으며, 변경 시 본 페이지에 시행일과
              함께 게시합니다.
            </p>
          </Section>
        </div>
      </div>
    </AppLayout>
  );
}

export default PrivacyPolicy;
