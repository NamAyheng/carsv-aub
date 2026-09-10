import React from 'react';
import { useApp } from '../../context/AppContext';
import { ROLE_DESK, ROLE_FOCUS, ROLE_LABEL } from '../../utils/roles';

export const RoleDeskBanner: React.FC = () => {
  const { currentRole, currentUser } = useApp();
  const firstName = currentUser.name.split(' ')[0];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{ROLE_DESK[currentRole]}</p>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">Hello, {firstName}</h1>
        <p className="text-xs text-slate-500 mt-1">{ROLE_FOCUS[currentRole]}</p>
      </div>
      <span className="self-start sm:self-center shrink-0 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100">
        Signed in as {ROLE_LABEL[currentRole]}
      </span>
    </div>
  );
};
