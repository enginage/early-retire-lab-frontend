import React from 'react';

const InputField = ({ label, name, value, onChange, type = "number", suffix, isCurrency = false }) => {
    const handleChange = (e) => {
        let newValue = e.target.value;
        if (isCurrency) {
            newValue = newValue.replace(/,/g, '');
            if (newValue === '') {
                // handle empty string
            } else if (isNaN(newValue)) {
                return;
            }
        }

        onChange({
            target: {
                name,
                value: newValue
            }
        });
    };

    const displayValue = isCurrency && value !== '' && !isNaN(value)
        ? Number(value).toLocaleString('en-US')
        : value;

    return (
        <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-wealth-muted">{label}</label>
            <div className="relative">
                <input
                    type={isCurrency ? "text" : type}
                    name={name}
                    value={displayValue}
                    onChange={handleChange}
                    className={`w-full bg-wealth-card text-wealth-text border border-gray-700/50 rounded-lg py-3 pl-4 focus:outline-none focus:ring-2 focus:ring-wealth-gold/50 focus:border-transparent transition-all shadow-inner ${isCurrency ? 'text-right' : ''} ${suffix ? 'pr-12' : 'pr-4'}`}
                    placeholder="0"
                />
                {suffix && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-wealth-muted text-sm pointer-events-none">
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    );
};

export default function InputForm({ inputs, handleChange }) {
    return (
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 shadow-xl">
            <h2 className="text-xl font-semibold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-wealth-gold to-yellow-200">
                조기 은퇴 투자 설정
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <InputField
                    label="시작 연도"
                    name="startYear"
                    value={inputs.startYear}
                    onChange={handleChange}
                    suffix="년"
                />
                <InputField
                    label="현재 나이"
                    name="startAge"
                    value={inputs.startAge}
                    onChange={handleChange}
                    suffix="세"
                />
                <InputField
                    label="초기 투자 자산 (Opening Balance)"
                    name="initialBalance"
                    value={inputs.initialBalance}
                    onChange={handleChange}
                    suffix="원"
                    isCurrency={true}
                />
                <InputField
                    label="기존 자산 목표 수익률"
                    name="targetReturnRate"
                    value={inputs.targetReturnRate}
                    onChange={handleChange}
                    suffix="%"
                />
                <InputField
                    label="매년 추가 투자금"
                    name="additionalInvestment"
                    value={inputs.additionalInvestment}
                    onChange={handleChange}
                    suffix="원"
                    isCurrency={true}
                />
                <InputField
                    label="추가 투자금 목표 수익률"
                    name="additionalInvestmentReturnRate"
                    value={inputs.additionalInvestmentReturnRate}
                    onChange={handleChange}
                    suffix="%"
                />
                <InputField
                    label="추가 투자금 인상률"
                    name="additionalInvestmentGrowthRate"
                    value={inputs.additionalInvestmentGrowthRate}
                    onChange={handleChange}
                    suffix="%"
                />
                <InputField
                    label="최종 목표 자산 (Closing Balance)"
                    name="targetClosingBalance"
                    value={inputs.targetClosingBalance}
                    onChange={handleChange}
                    suffix="원"
                    isCurrency={true}
                />
            </div>
        </div>
    );
}
