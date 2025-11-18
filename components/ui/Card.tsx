import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, title, className = '' }) => {
  return (
    <div className={`glass-panel rounded-xl p-6 md:p-8 shadow-2xl ${className}`}>
      {title && <h2 className="text-2xl font-bold mb-6 text-white neon-text">{title}</h2>}
      {children}
    </div>
  );
};

export default Card;