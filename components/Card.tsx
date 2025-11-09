import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div
      className={`bg-card-bg border border-app-border rounded-2xl shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;