
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white text-center p-4">
      <div className="container mx-auto">
        <p>&copy; {new Date().getFullYear()} ラジオ曲リクエストアプリ. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
