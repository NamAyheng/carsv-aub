import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Calendar,
  Lock,
  Edit,
  X,
  CheckCircle2,
  LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface CustomerProfileViewProps {
  onLogout: () => void;
}

export const CustomerProfileView: React.FC<CustomerProfileViewProps> = ({ onLogout }) => {
  const { currentUser, updateUser, addToast } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Edit fields
  const [name, setName] = useState(currentUser?.name || 'John Doe');
  const [phone, setPhone] = useState(currentUser?.phone || '+855 12 345 678');
  const [address, setAddress] = useState('St. 2004, Sen Sok, Phnom Penh');

  // Password fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(currentUser.id, {
      name,
      phone
    });
    setShowEditModal(false);
    addToast({
      type: 'success',
      title: 'Profile Updated',
      message: 'Your personal information has been updated successfully.'
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      addToast({
        type: 'error',
        title: 'Password Mismatch',
        message: 'New password and confirmation do not match.'
      });
      return;
    }
    setShowPasswordModal(false);
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    addToast({
      type: 'success',
      title: 'Password Changed',
      message: 'Your account password has been safely updated.'
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <User className="w-6 h-6 text-blue-500" />
            <span>Customer Profile & Account</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your personal identity, contact details, and account security.
          </p>
        </div>

        <button
          onClick={() => setShowEditModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/25 cursor-pointer"
        >
          <Edit className="w-3.5 h-3.5" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Main Profile Details Card */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 space-y-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-slate-800">
          <img
            src={
              currentUser?.avatar ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
            }
            alt={currentUser?.name}
            className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-500 shadow-xl shadow-blue-500/15"
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black text-white">{currentUser?.name || 'John Doe'}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Verified Account
              </span>
            </div>
            <p className="text-xs text-slate-400">Customer ID: {currentUser?.id || 'cust-1'}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Member since: {currentUser?.createdAt || 'January 2026'}</span>
            </p>
          </div>
        </div>

        {/* Detailed Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1">
              <Mail className="w-3 h-3 text-blue-400" />
              <span>Email Address</span>
            </span>
            <div className="font-bold text-white text-sm">{currentUser?.email || 'john.doe@example.com'}</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-400" />
              <span>Phone Number</span>
            </span>
            <div className="font-bold text-white text-sm">{currentUser?.phone || '+855 12 345 678'}</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-400" />
              <span>Primary Address</span>
            </span>
            <div className="font-bold text-white text-sm">{address}</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              <span>Security & Status</span>
            </span>
            <div className="font-bold text-emerald-400 text-sm">Active Customer (2FA Enabled)</div>
          </div>
        </div>

        {/* Security & Action Buttons */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap justify-between items-center gap-4">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Change Password</span>
          </button>

          <button
            onClick={onLogout}
            className="px-5 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold transition-all flex items-center gap-2 border border-red-500/30 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: EDIT PROFILE */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Edit Profile Details</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHANGE PASSWORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Change Security Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-lg"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
