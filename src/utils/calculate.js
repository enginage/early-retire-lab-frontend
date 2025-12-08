export const calculateProjection = (
    startYear,
    startAge,
    initialBalance,
    targetReturnRate,
    additionalInvestment,
    additionalInvestmentReturnRate,
    targetClosingBalance
) => {
    const data = [];
    let currentBalance = initialBalance;
    let year = startYear;
    let age = startAge;

    // Generate for 50 years or until age 100
    const maxYears = 50;

    for (let i = 0; i < maxYears; i++) {
        const openingBalance = Math.round(currentBalance);
        const openingReturn = Math.round(openingBalance * (targetReturnRate / 100));
        const openingPlusProfit = openingBalance + openingReturn;

        const addInv = Math.round(additionalInvestment);
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
