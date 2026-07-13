import React from 'react';
import TopNav from './TopNav';
import ContentFrame from './ContentFrame';
import Footer from './Footer';

const AppLayout = ({ 
  children,
}) => {
  return (
    <div className="min-h-screen bg-wealth-dark flex flex-col">
      <TopNav />
      
      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ContentFrame>
          {children}
        </ContentFrame>
      </div>
      <Footer />
    </div>
  );
};

export default AppLayout;
