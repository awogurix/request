
import React from 'react';
import { NavLink } from 'react-router-dom';
import { RadioIcon } from './icons/RadioIcon';

const Header: React.FC = () => {
  const activeLinkClass = "bg-radio-blue-dark text-white";
  const inactiveLinkClass = "text-white hover:bg-radio-blue-dark/50";
  const linkBaseClass = "px-4 py-2 rounded-md transition-colors duration-300 font-semibold";
  
  return (
    <header className="bg-radio-blue shadow-lg">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
        <div className="flex items-center mb-4 sm:mb-0">
          <RadioIcon className="w-10 h-10 text-radio-yellow" />
          <h1 className="text-2xl font-bold text-white ml-3">ラジオ曲リクエスト</h1>
        </div>
        <nav className="flex flex-wrap justify-center gap-2">
          <NavLink to="/" className={({ isActive }) => `${linkBaseClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
            リクエストする
          </NavLink>
          <NavLink to="/requests" className={({ isActive }) => `${linkBaseClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
            今日のリクエスト
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => `${linkBaseClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
            管理画面
          </NavLink>
          <NavLink to="/readme" className={({ isActive }) => `${linkBaseClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
            README
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
