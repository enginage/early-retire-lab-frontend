import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Introduction from './pages/Introduction';
import TargetSetting from './pages/TargetSetting';
import FinancialStatus from './pages/FinancialStatus';
import Settings from './pages/Settings';
import FreeLiving from './pages/FreeLiving';
import ExperienceLab from './pages/ExperienceLab';
import InvestmentIndicators from './pages/InvestmentIndicators';
import Login from './pages/Auth/Login';
import SignUp from './pages/Auth/SignUp';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Introduction />} />
          <Route path="/financial-status" element={<FinancialStatus />} />
          <Route path="/target-setting" element={<TargetSetting />} />
          <Route path="/simulation" element={<TargetSetting />} />
          <Route path="/free-living" element={<FreeLiving />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/experience-lab" element={<ExperienceLab />} />
          <Route path="/investment-indicators" element={<InvestmentIndicators />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
