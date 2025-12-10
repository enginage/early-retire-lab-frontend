import React from 'react';
import { formatNumber } from '../utils/calculate';

const TableHeader = ({ children }) => (
    <th className="px-4 py-3 text-right text-xs font-medium text-wealth-muted uppercase tracking-wider whitespace-nowrap sticky top-0 bg-wealth-card/90 backdrop-blur-md z-10 border-b border-gray-700 first:text-center">
        {children}
    </th>
);

const TableCell = ({ children, className = "" }) => (
    <td className={`px-4 py-3 text-sm text-wealth-text border-b border-gray-800/50 whitespace-nowrap text-right ${className}`}>
        {children}
    </td>
);

export default function SimulationTable({ data }) {
    return (
        <div className="bg-wealth-card/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-xl flex flex-col w-full overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center whitespace-nowrap">
                <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-wealth-green to-emerald-200">
                    조기 은퇴 시뮬레이션
                </h2>
                <div className='text-sm text-wealth-muted hidden sm:block'>
                    * 세금과 건강보험료를 고려하지 않았습니다.
                </div>
            </div>
            <div className="w-full overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                    <thead className="bg-gray-900/50">
                        <tr>
                            <TableHeader>연도</TableHeader>
                            <TableHeader>나이</TableHeader>
                            <TableHeader>Opening Balance</TableHeader>
                            <TableHeader>수익</TableHeader>
                            <TableHeader>Opening + 수익</TableHeader>
                            <TableHeader>추가 투자금</TableHeader>
                            <TableHeader>추가 투자 수익</TableHeader>
                            <TableHeader>추가 투자 + 수익</TableHeader>
                            <TableHeader>Closing Balance</TableHeader>
                            <TableHeader>목표 차액</TableHeader>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/30 bg-transparent">
                        {data.map((row) => (
                            <tr key={row.year} className="hover:bg-slate-800/30 transition-colors">
                                <TableCell className="font-mono text-wealth-muted !text-center">{row.year}</TableCell>
                                <TableCell className="font-mono text-wealth-muted !text-center">{row.age}</TableCell>
                                <TableCell>{formatNumber(row.openingBalance)}</TableCell>
                                <TableCell className="text-wealth-green">+{formatNumber(row.openingReturn)}</TableCell>
                                <TableCell>{formatNumber(row.openingPlusProfit)}</TableCell>
                                <TableCell>{formatNumber(row.additionalInvestment)}</TableCell>
                                <TableCell className="text-wealth-green">+{formatNumber(row.additionalInvestmentReturn)}</TableCell>
                                <TableCell>{formatNumber(row.additionalInvestmentPlusProfit)}</TableCell>
                                <TableCell className="font-bold text-wealth-gold">{formatNumber(row.closingBalance)}</TableCell>
                                <TableCell className={row.shortfall > 0 ? "text-red-400" : "text-wealth-green font-bold"}>
                                    {row.shortfall > 0 ? formatNumber(row.shortfall) : "목표 달성"}
                                </TableCell>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
