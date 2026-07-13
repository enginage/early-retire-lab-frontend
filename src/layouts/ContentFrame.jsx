import React from 'react';

const ContentFrame = ({ children }) => {
  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-wealth-dark">
      <div className="max-w-[95%] mx-auto px-6 py-8">
        {children}
      </div>
    </main>
  );
};

export default ContentFrame;

