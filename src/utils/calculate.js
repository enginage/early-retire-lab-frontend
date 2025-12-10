export const calculateProjection = (
    startYear,
    startAge,
    initialBalance,
    targetReturnRate,
    additionalInvestment,
    additionalInvestmentReturnRate,
    targetClosingBalance,
    additionalInvestmentGrowthRate = 0
) => {
    const data = [];
    let currentBalance = initialBalance;
    let currentAdditionalInvestment = additionalInvestment;
    let year = startYear;
    let age = startAge;

    // Generate for 50 years or until age 100
    const maxYears = 50;

    for (let i = 0; i < maxYears; i++) {
        const openingBalance = Math.round(currentBalance);
        const openingReturn = Math.round(openingBalance * (targetReturnRate / 100));
        const openingPlusProfit = openingBalance + openingReturn;

        const addInv = Math.round(currentAdditionalInvestment);
        const addInvReturn = Math.round(addInv * (additionalInvestmentReturnRate / 100));
        const addInvPlusProfit = addInv + addInvReturn;

        const closingBalance = openingPlusProfit + addInvPlusProfit;
        const shortfall = Math.round(targetClosingBalance - closingBalance);

        data.push({
            year,
            age,
            openingBalance,
            openingReturn,
            openingPlusProfit,
            additionalInvestment: addInv,
            additionalInvestmentReturn: addInvReturn,
            additionalInvestmentPlusProfit: addInvPlusProfit,
            closingBalance,
            shortfall,
        });

        if (closingBalance >= targetClosingBalance) {
            break;
        }

        currentBalance = closingBalance;
        // Increase additional investment for the next year
        currentAdditionalInvestment = currentAdditionalInvestment * (1 + additionalInvestmentGrowthRate / 100);
        year++;
        age++;
    }

    return data;
};

export const formatCurrency = (value) => {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        maximumFractionDigits: 0,
    }).format(value);
};

export const formatNumber = (value) => {
    return new Intl.NumberFormat('ko-KR').format(value);
};
