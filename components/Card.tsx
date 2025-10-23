
import React from 'react';

// FIX: Update CardProps to extend React.HTMLAttributes<HTMLDivElement> to allow passing standard HTML attributes like `style`.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div
      className={`bg-white/60 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;
