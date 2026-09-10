import React, { useState } from 'react';
import {
  Star,
  MessageSquare,
  CornerDownRight,
  Send,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer, demoCustomerId } from '../../utils/customerScope';

export const CustomerFeedbackView: React.FC = () => {
  const { feedbackList, currentUser, addFeedback, addToast, theme } = useApp();
  const isDark = theme === 'dark';

  const [overallRating, setOverallRating] = useState<number>(5);
  const [serviceRating, setServiceRating] = useState<number>(5);
  const [technicianRating, setTechnicianRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myFeedbacks = (feedbackList || []).filter((f) => belongsToCurrentCustomer(currentUser, f));

  const card = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200 shadow-sm';
  const inner = isDark
    ? 'bg-slate-950 border-slate-800'
    : 'bg-slate-50 border-slate-200';
  const title = isDark ? 'text-white' : 'text-slate-900';
  const muted = isDark ? 'text-slate-400' : 'text-slate-600';
  const body = isDark ? 'text-slate-200' : 'text-slate-700';

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      addToast({
        type: 'error',
        title: 'Comment Required',
        message: 'Please write a brief comment describing your service experience.'
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);

      addFeedback({
        customerId: demoCustomerId(currentUser),
        customerName: currentUser.name,
        customerAvatar: currentUser.avatar,
        workOrderId: 'wo-1',
        vehicleInfo: 'Toyota Camry Hybrid (PP-1234)',
        overallRating,
        serviceRating,
        technicianRating,
        speedRating: 5,
        comment: comment.trim(),
        managerResponse: 'Thank you for your warm rating, John! Master Technician Dara and the entire CarSV workshop team appreciate your trust.'
      });
      setComment('');
    }, 500);
  };

  const renderStars = (rating: number, onChange?: (r: number) => void) => {
    return (
      <div className="flex items-center gap-1 shrink-0">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            onClick={() => onChange && onChange(star)}
            className={`w-5 h-5 ${
              onChange ? 'cursor-pointer hover:scale-110 transition-transform' : ''
            } ${
              star <= rating
                ? 'fill-amber-400 text-amber-400'
                : isDark ? 'text-slate-600' : 'text-slate-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-3xl border ${card}`}>
        <h2 className={`text-2xl font-bold tracking-tight flex items-center gap-2.5 ${title}`}>
          <MessageSquare className="w-6 h-6 text-blue-500" />
          <span>Customer Reviews &amp; Feedback</span>
        </h2>
        <p className={`text-sm mt-1.5 leading-relaxed ${muted}`}>
          Share your workshop experience, rate our master technicians, and receive responses from service managers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-6 rounded-3xl border p-6 sm:p-8 space-y-6 ${card}`}>
          <div className="space-y-1">
            <h3 className={`text-lg font-bold flex items-center gap-2 ${title}`}>
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Rate Your Experience</span>
            </h3>
            <p className={`text-sm leading-relaxed ${muted}`}>
              Your feedback helps us keep repair quality consistent across all 8 bays.
            </p>
          </div>

          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div className={`p-3 rounded-2xl border flex justify-between items-center gap-4 ${inner}`}>
              <div>
                <div className={`text-sm font-bold ${title}`}>Overall Experience</div>
                <div className={`text-xs ${muted}`}>General satisfaction with this visit</div>
              </div>
              {renderStars(overallRating, setOverallRating)}
            </div>

            <div className={`p-3 rounded-2xl border flex justify-between items-center gap-4 ${inner}`}>
              <div>
                <div className={`text-sm font-bold ${title}`}>Service &amp; Repair Quality</div>
                <div className={`text-xs ${muted}`}>Mechanical work and transparency</div>
              </div>
              {renderStars(serviceRating, setServiceRating)}
            </div>

            <div className={`p-3 rounded-2xl border flex justify-between items-center gap-4 ${inner}`}>
              <div>
                <div className={`text-sm font-bold ${title}`}>Technician Professionalism</div>
                <div className={`text-xs ${muted}`}>Communication and cleanliness</div>
              </div>
              {renderStars(technicianRating, setTechnicianRating)}
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-1.5 ${title}`}>
                Tell us about your experience
              </label>
              <textarea
                rows={4}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How did the repairs feel? Was the live bay camera helpful? Any suggestions for our team?"
                className={`w-full p-3.5 border rounded-2xl text-sm leading-relaxed focus:outline-none focus:border-blue-500 transition-colors ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-6 space-y-4">
          <div className={`rounded-3xl border p-6 space-y-4 ${card}`}>
            <h3 className={`text-lg font-bold ${title}`}>Your Past Reviews &amp; Workshop Responses</h3>

            <div className="space-y-4">
              {myFeedbacks.length === 0 && (
                <p className={`text-sm leading-relaxed ${muted}`}>
                  You have not submitted a review yet. Rate a completed service on the left.
                </p>
              )}

              {myFeedbacks.map((item) => (
                <div key={item.id} className={`p-4 rounded-2xl border space-y-3 ${inner}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className={`font-bold text-sm ${title}`}>
                        {item.vehicleInfo || 'Toyota Camry Hybrid (PP-1234)'}
                      </div>
                      <div className={`text-xs mt-0.5 ${muted}`}>{item.createdAt || 'Recent'}</div>
                    </div>
                    {renderStars(item.overallRating)}
                  </div>

                  <p className={`text-sm italic leading-relaxed ${body}`}>
                    &ldquo;{item.comment}&rdquo;
                  </p>

                  {item.managerResponse && (
                    <div
                      className={`p-3.5 rounded-xl border space-y-1.5 ${
                        isDark
                          ? 'bg-blue-950/50 border-blue-800/60'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div
                        className={`flex items-center gap-1.5 font-bold text-xs ${
                          isDark ? 'text-blue-300' : 'text-blue-800'
                        }`}
                      >
                        <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                        <span>Manager Response (Sopheap Mao)</span>
                      </div>
                      <p
                        className={`text-sm leading-relaxed ${
                          isDark ? 'text-slate-200' : 'text-slate-800'
                        }`}
                      >
                        {item.managerResponse}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
