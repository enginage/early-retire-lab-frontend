import React, { useState, useEffect } from 'react';

/**
 * 공개 도구 페이지 상단 SEO 설명·FAQ 블록
 * @param {{
 *   title: string,
 *   paragraphs: string[],
 *   steps?: string[],
 *   faqs?: { question: string, answer: string }[],
 * }} props
 */
export default function SeoContentSection({ title, paragraphs, steps, faqs }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [title]);

  return (
    <div className="max-w-[95%] mx-auto px-4 sm:px-6 pt-6 pb-2 border-b border-gray-800/80">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="seo-content-panel"
        className="flex items-center gap-1.5 text-sm font-medium text-wealth-muted hover:text-wealth-gold transition-colors"
      >
        <span>사용법</span>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <section
          id="seo-content-panel"
          className="pt-4 pb-2"
          aria-label={`${title} 소개`}
        >
          <h1 className="text-xl sm:text-2xl font-semibold text-white mb-3">{title}</h1>

          <div className="space-y-2 text-sm sm:text-base text-wealth-muted leading-relaxed">
            {paragraphs.map((text) => (
              <p key={text.slice(0, 40)}>{text}</p>
            ))}
          </div>

          {steps && steps.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-medium text-white mb-2">사용 방법</h2>
              <ol className="list-decimal list-inside space-y-1 text-sm text-wealth-muted">
                {steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {faqs && faqs.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-medium text-white mb-2">자주 묻는 질문</h2>
              <div className="space-y-2">
                {faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="group rounded-lg border border-gray-800 bg-wealth-card/30 overflow-hidden"
                  >
                    <summary className="cursor-pointer px-4 py-3 text-sm text-white font-medium list-none flex items-center justify-between gap-2 hover:bg-wealth-card/50 transition-colors [&::-webkit-details-marker]:hidden">
                      <span>{faq.question}</span>
                      <svg
                        className="w-4 h-4 shrink-0 text-wealth-muted group-open:rotate-180 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <p className="px-4 pb-3 text-sm text-wealth-muted leading-relaxed border-t border-gray-800/60 pt-3">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
