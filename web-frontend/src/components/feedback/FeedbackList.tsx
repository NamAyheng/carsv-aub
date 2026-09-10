import React, { useState } from 'react';
import {
  Star,
  Search,
  MessageSquare,
  ThumbsUp,
  CheckCircle,
  Clock,
  User,
  Car,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { Feedback } from '../../types';

export const FeedbackList: React.FC = () => {
  const { feedback, feedbackList, updateFeedback, addToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');

  const list = feedbackList || feedback || [];

  const averageRating = (
    list.reduce((acc, f) => acc + (f.overallRating || (f as any).rating || 5), 0) / Math.max(1, list.length)
  ).toFixed(1);

  const filteredFeedback = list.filter((fb) => {
    const fbRating = fb.overallRating || (fb as any).rating || 5;
    const matchesSearch =
      fb.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.vehicleInfo && fb.vehicleInfo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (fb.comment && fb.comment.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRating =
      ratingFilter === 'ALL' || fbRating === parseInt(ratingFilter);

    return matchesSearch && matchesRating;
  });

  const handleApprove = (fb: Feedback) => {
    updateFeedback(fb.id, { status: 'PUBLISHED' });
    addToast({
      type: 'success',
      title: 'Review Published',
      message: `Feedback from ${fb.customerName} is now visible on public portal.`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Customer Feedback & CSAT</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono font-bold">
              {feedbackList.length} Reviews
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Post-service quality reviews, customer satisfaction scores, and mechanic praise.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast({ type: 'info', title: 'Reviews Exported', message: 'CSAT report saved.' })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export Reviews</span>
          </button>
        </div>
      </div>

      {/* Satisfaction Score Overview */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <span className="text-4xl font-extrabold font-mono text-amber-500">{averageRating}</span>
            <div className="flex items-center justify-center gap-0.5 text-amber-400 text-xs mt-1">
              {'★'.repeat(5)}
            </div>
            <span className="text-[10px] text-amber-800 font-bold uppercase mt-1 block">Garage CSAT Rating</span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600">
            <p className="font-bold text-slate-900 text-sm">96.8% Positive Service Experience</p>
            <p>Based on verified customer visits across all 5 service bays.</p>
            <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px] pt-1">
              <span>5 Stars: <strong>82%</strong></span>
              <span>4 Stars: <strong>14%</strong></span>
              <span>3 Stars: <strong>4%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reviews by customer, vehicle, or comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
          >
            <option value="ALL">All Star Ratings</option>
            <option value="5">5 Stars Only</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
          </select>
        </div>
      </div>

      {/* Feedback Reviews List */}
      <div className="space-y-4">
        {filteredFeedback.map((fb) => (
          <div
            key={fb.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 transition-all hover:border-slate-300"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  {fb.customerName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{fb.customerName}</h4>
                  <p className="text-xs text-slate-500 font-mono">
                    {fb.vehicleInfo} • {fb.createdAt || (fb as any).date || 'Recent'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center text-amber-400 text-sm font-bold">
                  {'★'.repeat(Math.min(5, Math.max(1, fb.overallRating || (fb as any).rating || 5)))}
                  {'☆'.repeat(Math.max(0, 5 - (fb.overallRating || (fb as any).rating || 5)))}
                </div>
                <StatusBadge status={fb.status} size="sm" />
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 italic">
              "{fb.comment}"
            </p>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-400 font-mono text-[10px]">
                Work Order ID: #{fb.workOrderId}
              </span>

              {fb.status === 'UNDER_REVIEW' && (
                <button
                  onClick={() => handleApprove(fb)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-2xs"
                >
                  Approve & Publish
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
