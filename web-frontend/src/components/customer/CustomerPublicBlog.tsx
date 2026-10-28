import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Tag } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { loadPublicBlog, PublicBlogPost } from '../../api/blog';
import { CustomerPublicShell, CustomerPublicShellHandlers } from './CustomerPublicShell';

interface CustomerPublicBlogProps extends CustomerPublicShellHandlers {
  onBackHome: () => void;
}

export const CustomerPublicBlog: React.FC<CustomerPublicBlogProps> = (props) => {
  const { onBackHome, onOpenBooking, onOpenAuth, onOpenCustomerPortal } = props;
  const { theme, services, isAuthenticated } = useApp();
  const isDark = theme === 'dark';
  const [posts, setPosts] = useState<PublicBlogPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState('All');
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    let cancelled = false;
    void loadPublicBlog()
      .then((rows) => {
        if (!cancelled) setPosts(rows);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = posts.find((post) => post.featured) || posts[0];
  const categories = ['All', ...Array.from(new Set(posts.map((post) => post.category)))];
  const filtered = useMemo(
    () => (category === 'All' ? posts : posts.filter((post) => post.category === category)),
    [category, posts]
  );
  const article = posts.find((post) => post.id === activeId) || null;
  const offers = services || [];

  const page = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const muted = isDark ? 'text-slate-400' : 'text-slate-600';
  const title = isDark ? 'text-white' : 'text-slate-900';
  const chip = isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-700 border-slate-200';
  const chipOn = 'bg-blue-600 text-white border-blue-600';

  const handleBook = (serviceId?: string) => {
    if (onOpenBooking) onOpenBooking(serviceId);
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
            {article.image ? (
              <img src={article.image} alt={article.title} className="mt-6 w-full h-64 object-cover rounded-2xl" />
            ) : null}
            <div className="mt-6 space-y-4">
              {article.body.map((para) => (
                <p key={para.slice(0, 40)} className={`text-base leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  {para}
                </p>
              ))}
            </div>
            {article.tips.length > 0 && (
              <div className={`mt-8 p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-blue-50 border-blue-100'}`}>
                <p className={`text-sm font-bold mb-2 ${title}`}>Workshop tips</p>
                <ul className={`space-y-2 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {article.tips.map((tip) => (
                    <li key={tip}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => handleBook()}
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm"
            >
              Book a service
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
                    What the workshop does, and how to use it.
                  </h1>
                  <p className={`text-base leading-relaxed max-w-2xl ${muted}`}>
                    These articles explain the services on the public catalog. Sign in when you want your own vehicles, the parts in stock, and your invoices.
                  </p>
                </div>
                {offers[0] && (
                  <div className={`lg:col-span-5 p-5 rounded-3xl border ${card}`}>
                    <p className={`text-xs font-bold uppercase mb-3 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      On the service catalog
                    </p>
                    <p className={`text-lg font-bold ${title}`}>{offers[0].name}</p>
                    <p className={`text-sm mt-1 leading-relaxed ${muted}`}>{offers[0].description}</p>
                    <p className="text-2xl font-black text-blue-600 mt-3">
                      From ${(offers[0].estimatedTotal ?? offers[0].basePrice).toFixed(2)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleBook(offers[0].id)}
                      className="mt-4 w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm"
                    >
                      Book this service
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                {!loaded && <p className={`text-sm ${muted}`}>Loading articles…</p>}
                {loaded && !featured && (
                  <div className={`p-8 rounded-3xl border text-center ${card}`}>
                    <h2 className={`text-2xl font-bold ${title}`}>No articles are published</h2>
                    <p className={`mt-2 text-sm ${muted}`}>The workshop has not published a journal entry yet. The services on the right are still bookable.</p>
                  </div>
                )}
                {featured && (
                  <button type="button" onClick={() => openArticle(featured)} className={`w-full text-left overflow-hidden rounded-3xl border ${card}`}>
                    {featured.image ? <img src={featured.image} alt={featured.title} className="w-full h-56 object-cover" /> : null}
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
                )}

                {posts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCategory(item)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border ${category === item ? chipOn : chip}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  {filtered.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => openArticle(post)}
                      className={`text-left rounded-2xl border overflow-hidden ${card}`}
                    >
                      {post.image ? <img src={post.image} alt="" className="w-full h-36 object-cover" /> : null}
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
                    Services you can book
                  </p>
                  <p className={`text-xs mt-1 mb-4 ${muted}`}>
                    Starting prices from the workshop catalog. The final invoice depends on the car.
                  </p>
                  <div className="space-y-3">
                    {offers.map((offer) => (
                      <button
                        key={offer.id}
                        type="button"
                        onClick={() => handleBook(offer.id)}
                        className={`w-full text-left p-3 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}
                      >
                        <p className={`text-[11px] font-bold uppercase ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{offer.category}</p>
                        <p className={`text-sm font-bold mt-0.5 ${title}`}>{offer.name}</p>
                        <p className={`text-xs mt-1 leading-relaxed ${muted}`}>{offer.description}</p>
                        <p className="text-sm font-black text-blue-600 mt-2">
                          From ${(offer.estimatedTotal ?? offer.basePrice).toFixed(2)}
                        </p>
                      </button>
                    ))}
                    {offers.length === 0 && <p className={`text-sm ${muted}`}>No active services are listed yet.</p>}
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border ${card}`}>
                  <p className={`text-sm font-bold ${title}`}>{isAuthenticated ? 'Your full account' : 'After you sign in'}</p>
                  <ul className={`mt-3 space-y-2 text-sm leading-relaxed ${muted}`}>
                    <li>Your vehicles and upcoming bookings</li>
                    <li>Warehouse parts, with the price and quantity in stock</li>
                    <li>Repair status, invoices, and payment history</li>
                    <li>St. 271, Khan Meanchey · Mon–Sat 07:30–18:30</li>
                  </ul>
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </CustomerPublicShell>
  );
};
