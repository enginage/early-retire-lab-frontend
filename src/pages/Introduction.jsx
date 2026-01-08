import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';

function Introduction() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
            <span className="text-wealth-gold italic">Ius vivendi ut vult</span>
          </h1>
          <p className="text-2xl md:text-3xl text-wealth-muted font-light mb-8">
            원하는대로 살아갈 권리
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* Introduction Section */}
          <section className="bg-wealth-card/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-gray-800">
            <h2 className="text-3xl font-bold text-white mb-6">
              Redesign your life
            </h2>
            <div className="space-y-4 text-lg text-wealth-muted leading-relaxed">
              <p>
                여기에 온 당신에게 전하고 싶은 메시지가 있습니다.
              </p>
              <p className="text-xl text-white font-medium">
                <span className="text-wealth-gold">"당신이 원하는대로 살아갈 권리"</span>가 있다는 것을.
              </p>
              <p>
                우리는 종종 사회가 정해준 틀 안에서 살아가야 한다고 생각합니다. 
                정해진 나이에 퇴직하고, 정해진 방식으로 살아가야 한다고 생각합니다. 
                하지만 그것이 정말 당신이 원하는 삶일까요?
              </p>
            </div>
          </section>

          {/* Early Retirement Section */}
          <section className="bg-gradient-to-br from-wealth-card/50 to-wealth-card/30 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-gray-800">
            <h2 className="text-3xl font-bold text-white mb-6">
              조기 은퇴, 그리고 진정한 자유
            </h2>
            <div className="space-y-4 text-lg text-wealth-muted leading-relaxed">
              <p>
                조기 은퇴(FIRE: Financial Independence, Retire Early)는 단순히 일찍 그만두는 것이 아닙니다. 
                그것은 <span className="text-white font-medium">경제적 자유를 통해 진정으로 자신이 원하는 삶을 살 수 있는 권리를 얻는 것</span>입니다.
              </p>
              <p>
                당신이 하고 싶은 일을 하면서 살 수 있는 권리.
                시간에 쫓기지 않고, 누군가의 기대에 맞추지 않고, 
                오직 자신의 가치와 열정에 따라 살아갈 수 있는 권리.
              </p>
              <p className="text-xl text-white font-medium pt-4">
                그것이 바로 <span className="text-wealth-gold">진정한 자유 </span>입니다.
              </p>
            </div>
          </section>

          {/* Call to Action Section */}
          <section className="bg-wealth-card/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-gray-800 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              시작해봅시다
            </h2>
            <p className="text-lg text-wealth-muted mb-8 leading-relaxed max-w-2xl mx-auto">
              조기 은퇴는 먼 미래의 이야기가 아닙니다. 
              올바른 계획과 실행을 통해 당신도 경제적 자유를 얻고, 
              진정으로 원하는 삶을 살 수 있습니다.
            </p>
            <Link 
              to="/experience-lab?menu=early-retirement" 
              className="inline-block px-8 py-4 bg-gradient-to-r from-wealth-gold to-yellow-600 text-white font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200 shadow-lg shadow-yellow-900/30 hover:shadow-xl hover:shadow-yellow-900/40"
            >
              조기 은퇴 체험실
            </Link>
          </section>

          {/* Quote Section */}
          <section className="text-center py-8">
            <blockquote className="text-2xl md:text-3xl text-wealth-gold italic font-light">
              "본인이 하고 싶은 것을 하면서 살자"
            </blockquote>
            <p className="text-wealth-muted mt-4 text-sm">
              - Enginage
            </p>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

export default Introduction;

