import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Mail,
  Tag
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PUBLIC_BLOG_OFFERS, PUBLIC_BLOG_POSTS, PublicBlogPost } from '../../data/publicBlog';
import { CustomerPublicShell, CustomerPublicShellHandlers } from './CustomerPublicShell';

interface CustomerPublicBlogProps extends CustomerPublicShellHandlers {
  onBackHome: () => void;
}

export const CustomerPublicBlog: React.FC<CustomerPublicBlogProps> = (props) => {
  const {
    onBackHome,
    onOpenBooking,
    onOpenAuth,
    onOpenCustomerPortal
  } = props;
  const { theme, addToast } = useApp();
  const isDark = theme === 'dark';
  const [category, setCategory] = useState('All');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const featured = PUBLIC_BLOG_POSTS.find((p) => p.featured) || PUBLIC_BLOG_POSTS[0];
  const categories = ['All', ...Array.from(new Set(PUBLIC_BLOG_POSTS.map((p) => p.category)))];
  const filtered = useMemo(
    () => (category === 'All' ? PUBLIC_BLOG_POSTS : PUBLIC_BLOG_POSTS.filter((p) => p.category === category)),
    [category]
  );
  const article = PUBLIC_BLOG_POSTS.find((p) => p.id === activeId) || null;

  const page = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const muted = isDark ? 'text-slate-400' : 'text-slate-600';
  const title = isDark ? 'text-white' : 'text-slate-900';
  const chip = isDark
    ? 'bg-slate-800 text-slate-200 border-slate-700'
    : 'bg-white text-slate-700 border-slate-200';
  const chipOn = 'bg-blue-600 text-white border-blue-600';

  const handleBook = () => {
    if (onOpenBooking) onOpenBooking();
    else if (onOpenCustomerPortal) onOpenCustomerPortal();
    else if (onOpenAuth) onOpenAuth('LOGIN');
  };

  const openArticle = (post: PublicBlogPost) => {
    setActiveId(post.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <CustomerPublicShell currentPage="blog" {...props} onBackHome={onBackHome}>
      <div className={page}>
        {article ? (
          <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className={`inline-flex items-center gap-2 text-sm font-semibold mb-6 ${isDark ? 'text-sky-300' : 'text-blue-600'}`}
            >
              <ArrowLeft className="w-4 h-4" />
              All articles
            </button>
            <p className={`text-xs font-bold uppercase ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
              {article.category} · {article.readTime} · {article.date}
            </p>
            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 ${title}`}>{article.title}</h1>
            <p className={`mt-2 text-sm ${muted}`}>By {article.author}</p>
            <img src={article.image} alt={article.title} className="mt-6 w-full h-64 object-cover rounded-2xl" />
            <div className="mt-6 space-y-4">
              {article.body.map((para) => (
                <p key={para.slice(0, 24)} className={`text-base leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  {para}
                </p>
              ))}
            </div>
            <div className={`mt-8 p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-blue-50 border-blue-100'}`}>
              <p className={`text-sm font-bold mb-2 ${title}`}>Workshop tips</p>
              <ul className={`space-y-2 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {article.tips.map((tip) => (
                  <li key={tip}>• {tip}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={handleBook}
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm"
            >
              Book this kind of service
              <ArrowRight className="w-4 h-4" />
            </button>
          </article>
        ) : (
          <>
            <section className={`border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <p className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    <BookOpen className="w-4 h-4" />
                    CarSV Journal — open to every visitor
                  </p>
                  <h1 className={`text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight ${title}`}>
                    Friendly car knowledge, plus this month’s workshop offers.
                  </h1>
                  <p className={`text-base leading-relaxed max-w-2xl ${muted}`}>
                    No login. Read about oil, brakes, batteries, AC, hybrids, and wet-road safety. Offers on this page are advertisements from the St. 271 workshop — book when you are ready.
                  </p>
                </div>
                <div className={`lg:col-span-5 p-5 rounded-3xl border ${card}`}>
                  <p className={`text-xs font-bold uppercase mb-3 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    Workshop advertisement
                  </p>
                  <p className={`text-lg font-bold ${title}`}>Monsoon ready package</p>
                  <p className={`text-sm mt-1 leading-relaxed ${muted}`}>
                    Cabin filter + AC check + tire pressure set. Mention this blog page at the counter.
                  </p>
                  <p className="text-2xl font-black text-blue-600 mt-3">From $39</p>
                  <button
                    type="button"
                    onClick={handleBook}
                    className="mt-4 w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm"
                  >
                    Reserve a bay
                  </button>
                </div>
              </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                <button type="button" onClick={() => openArticle(featured)} className={`w-full text-left overflow-hidden rounded-3xl border ${card}`}>
                  <img src={featured.image} alt={featured.title} className="w-full h-56 object-cover" />
                  <div className="p-6">
                    <p className={`text-xs font-bold uppercase ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      Featured · {featured.category}
                    </p>
                    <h2 className={`text-2xl font-bold mt-1 ${title}`}>{featured.title}</h2>
                    <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{featured.excerpt}</p>
                    <span className={`inline-flex items-center gap-1.5 mt-4 text-sm font-semibold ${isDark ? 'text-sky-300' : 'text-blue-600'}`}>
                      Read the guide <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </button>

                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border ${category === c ? chipOn : chip}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {filtered.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => openArticle(post)}
                      className={`text-left rounded-2xl border overflow-hidden ${card}`}
                    >
                      <img src={post.image} alt="" className="w-full h-36 object-cover" />
                      <div className="p-4">
                        <p className={`text-[11px] font-bold uppercase ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                          {post.category} · {post.readTime}
                        </p>
                        <h3 className={`text-base font-bold mt-1 leading-snug ${title}`}>{post.title}</h3>
                        <p className={`text-sm mt-1.5 leading-relaxed ${muted}`}>{post.excerpt}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <aside className="lg:col-span-4 space-y-4">
                <div className={`p-5 rounded-2xl border ${card}`}>
                  <p className={`text-sm font-bold flex items-center gap-2 ${title}`}>
                    <Tag className="w-4 h-4 text-blue-500" />
                    This month on the rack
                  </p>
                  <p className={`text-xs mt-1 mb-4 ${muted}`}>Advertised starting prices. Final quote depends on your car.</p>
                  <div className="space-y-3">
                    {PUBLIC_BLOG_OFFERS.map((offer) => (
                      <div key={offer.id} className={`p-3 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
                        <p className={`text-[11px] font-bold uppercase ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{offer.badge}</p>
                        <p className={`text-sm font-bold mt-0.5 ${title}`}>{offer.title}</p>
                        <p className={`text-xs mt-1 leading-relaxed ${muted}`}>{offer.detail}</p>
                        <p className="text-sm font-black text-blue-600 mt-2">{offer.price}</p>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleBook} className="mt-4 w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold">
                    Book from an offer
                  </button>
                </div>

                <div className={`p-5 rounded-2xl border ${card}`}>
                  <p className={`text-sm font-bold ${title}`}>Workshop notes</p>
                  <ul className={`mt-3 space-y-2 text-sm leading-relaxed ${muted}`}>
                    <li>St. 271, Khan Meanchey, Phnom Penh</li>
                    <li>Mon–Sat 07:30–18:30 · Sunday emergency until 14:00</li>
                    <li>+855 12 888 901 · care@carsv.com</li>
                    <li>Live bay cameras on booked jobs — after you sign in to the portal</li>
                  </ul>
                </div>

                <div className={`p-5 rounded-2xl border ${card}`}>
                  <p className={`text-sm font-bold ${title}`}>Email the journal</p>
                  <p className={`text-xs mt-1 ${muted}`}>Seasonal reminders only. Demo — nothing is sent to a server.</p>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className={`mt-3 w-full p-2.5 rounded-xl border text-sm ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addToast({
                        type: 'success',
                        title: 'Saved on this demo',
                        message: email ? `We noted ${email} for the journal list.` : 'Add an email first.'
                      });
                      setEmail('');
                    }}
                    className={`mt-2 w-full py-2.5 rounded-xl text-sm font-bold border ${
                      isDark ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-800 bg-slate-50'
                    }`}
                  >
                    <Mail className="w-4 h-4 inline mr-1.5" />
                    Notify me
                  </button>
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </CustomerPublicShell>
  );
};
