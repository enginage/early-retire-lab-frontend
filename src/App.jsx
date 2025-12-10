import React, { useState, useEffect } from 'react';
import InputForm from './components/InputForm';
import SimulationTable from './components/SimulationTable';
import { calculateProjection } from './utils/calculate';

function App() {
  const [inputs, setInputs] = useState({
    startYear: new Date().getFullYear(),
    startAge: 40,
    initialBalance: 200000000,
    targetReturnRate: 20.0,
    additionalInvestment: 20000000,
    additionalInvestmentReturnRate: 10.0,
    targetClosingBalance: 1000000000,
    additionalInvestmentGrowthRate: 0,
  });

  const [simulationData, setSimulationData] = useState([]);

  useEffect(() => {
    // Basic validation to prevent NaN issues during typing
    const validInputs = {
      startYear: Number(inputs.startYear) || 2025,
      startAge: Number(inputs.startAge) || 40,
      initialBalance: Number(inputs.initialBalance) || 0,
      targetReturnRate: Number(inputs.targetReturnRate) || 0,
      additionalInvestment: Number(inputs.additionalInvestment) || 0,
      additionalInvestmentReturnRate: Number(inputs.additionalInvestmentReturnRate) || 0,
      targetClosingBalance: Number(inputs.targetClosingBalance) || 0,
      additionalInvestmentGrowthRate: Number(inputs.additionalInvestmentGrowthRate) || 0,
    };

    const data = calculateProjection(
      validInputs.startYear,
      validInputs.startAge,
      validInputs.initialBalance,
      validInputs.targetReturnRate,
      validInputs.additionalInvestment,
      validInputs.additionalInvestmentReturnRate,
      validInputs.targetClosingBalance,
      validInputs.additionalInvestmentGrowthRate
    );
    setSimulationData(data);
  }, [inputs]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-wealth-dark pb-20">
      {/* Header */}
      <header className="bg-wealth-card/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-wealth-gold to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-900/20">
              <span className="text-white text-xl font-bold">L</span>
            </div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              조기은퇴연구소
            </h1> */}
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#" className="text-wealth-muted hover:text-wealth-gold transition-colors text-sm font-medium">소개</a>
            <a href="#" className="text-wealth-gold font-medium text-sm">시뮬레이션</a>
            <a href="#" className="text-wealth-muted hover:text-wealth-gold transition-colors text-sm font-medium">커뮤니티</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            당신의 <span className="text-wealth-gold">파이어족</span> 꿈을 <br /> 현실로 만드세요
          </h2>
          <p className="text-lg text-wealth-muted max-w-2xl mx-auto">
            복리의 마법을 확인하고 구체적인 목표를 세워보세요.
            매년 성장하는 자산을 시각화하여 경제적 자유의 시점을 예측합니다.
          </p>
        </div> */}

        <div className="space-y-8">
          <InputForm inputs={inputs} handleChange={handleChange} />
          <SimulationTable data={simulationData} />
        </div>
      </main>
    </div>
  );
}

export default App;
