import React, { useEffect, useState } from 'react';
import {
  Car,
  Wrench,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Video,
  Receipt,
  Star,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  Award,
  Cpu,
  Layers,
  FileText,
  UserCheck,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Camera,
  BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { pathForSection } from '../../routes';
import { loadPublicBlog, PublicBlogPost } from '../../api/blog';
import { CustomerPublicShell } from './CustomerPublicShell';


interface CustomerPublicLandingProps {
  onOpenAuth?: (mode: 'LOGIN' | 'REGISTER') => void;
  onOpenBooking?: (serviceId?: string) => void;
  onEnterCustomerPortal?: () => void;
  onOpenCustomerPortal?: () => void;
  onOpenBlog?: () => void;
}

export const CustomerPublicLanding: React.FC<CustomerPublicLandingProps> = ({
  onOpenAuth,
  onOpenBooking,
  onEnterCustomerPortal,
  onOpenCustomerPortal,
  onOpenBlog
}) => {
  const { services, isAuthenticated, theme } = useApp();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [featuredPost, setFeaturedPost] = useState<PublicBlogPost | null>(null);

  const handleOpenAuth = (mode: 'LOGIN' | 'REGISTER') => {
    if (onOpenAuth) onOpenAuth(mode);
    else if (onOpenCustomerPortal) onOpenCustomerPortal();
    else if (onEnterCustomerPortal) onEnterCustomerPortal();
  };

  const handleOpenBooking = (serviceId?: string) => {
    if (onOpenBooking) onOpenBooking(serviceId);
    else if (onOpenCustomerPortal) onOpenCustomerPortal();
    else if (onEnterCustomerPortal) onEnterCustomerPortal();
  };

  const handleEnterCustomer = () => {
    if (onOpenCustomerPortal) onOpenCustomerPortal();
    else if (onEnterCustomerPortal) onEnterCustomerPortal();
  };

  const goToBlog = () => {
    navigate(pathForSection('blog'));
  };
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    let cancelled = false;
    void loadPublicBlog()
      .then((rows) => {
        if (!cancelled) setFeaturedPost(rows.find((post) => post.featured) || rows[0] || null);
      })
      .catch(() => {
        if (!cancelled) setFeaturedPost(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const greyBtn = isDark
    ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
    : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300';
  const greyChip = isDark
    ? 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300';

  const categories = ['ALL', ...Array.from(new Set((services || []).map((service) => service.category).filter(Boolean)))];
  const listedServices = services || [];
  const startingPrice = listedServices.length
    ? Math.min(...listedServices.map((service) => service.basePrice))
    : null;

  const filteredServices = (services || []).filter((s) => {
    if (selectedCategory === 'ALL') return true;
    return s.category.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const scrollToSection = (id: string) => {
    navigate(pathForSection(id));
  };

  return (
    <CustomerPublicShell
      currentPage="home"
      onOpenAuth={onOpenAuth}
      onOpenBooking={onOpenBooking}
      onEnterCustomerPortal={onEnterCustomerPortal}
      onOpenCustomerPortal={onOpenCustomerPortal}
      onOpenBlog={onOpenBlog}
    >
      {/* 2. Hero Section */}
      <section id="home" className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-800/60">
        {/* Ambient Glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute -top-40 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Phnom Penh workshop · book a service, then follow it in your account</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                Professional Vehicle Care. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
                  Simple. Transparent. Reliable.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
                The public site lists the services this garage offers and explains them in the journal. Sign in to see your vehicles, the parts in stock, and your invoices.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => onOpenBooking()}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
                >
                  <Calendar className="w-5 h-5 text-blue-200 group-hover:scale-110 transition-transform" />
                  <span>Book an Appointment</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => scrollToSection('services')}
                  className={`w-full sm:w-auto px-7 py-4 rounded-xl font-semibold text-base border transition-all flex items-center justify-center gap-2 ${greyBtn}`}
                >
                  <span>Explore Our Services</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Verified Trust Metrics */}
              <div className="pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-2xl font-black text-white">{listedServices.length}</div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">Services you can book</div>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-2xl font-black text-emerald-400">
                    {startingPrice === null ? '—' : `$${startingPrice.toFixed(0)}`}
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">Lowest starting price</div>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-2xl font-black text-amber-400">{isAuthenticated ? 'Yours' : 'Sign in'}</div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">Parts, cars, invoices</div>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="text-2xl font-black text-blue-400">Mon–Sat</div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">07:30–18:30</div>
                </div>
              </div>
            </div>

            {/* Hero Right Visuals: High Quality Automotive Workshop Imagery & Live Badge */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900 group">
                <img
                  src="/media/blog/bmw-wheel-impact-wrench-service.jpg"
                  alt="CarSV High-Tech Workshop Bay"
                  className="w-full h-[460px] object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                {/* Floating Live Inspection Card */}
                <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700/80 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                      <span className="text-xs font-bold text-white tracking-wide uppercase">No live repair</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      No camera
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">No vehicle is on a lift</div>
                      <div className="text-slate-400 text-[11px]">Repair progress appears here after the garage opens a job.</div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-slate-700 h-full rounded-full w-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Company Introduction ("What are we?") */}
      <section id="about" className="py-20 bg-slate-900/50 border-b border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
              <Award className="w-3.5 h-3.5" />
              <span>What We Do & Who We Are</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              A Complete Automotive Service Center Designed for Vehicle Owners
            </h2>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              CarSV bridges certified precision mechanics with digital real-time transparency. From routine fluid maintenance to complex hybrid engine overhauls, our facility is built to keep your vehicle performing at peak safety.
            </p>
          </div>

          {/* The 6 Core Capabilities Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Vehicle Repair */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-blue-600/15 text-blue-400 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Vehicle Repair</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Advanced diagnostic scan and master mechanical repair for engines, gearboxes, brakes, suspension, radiators, and hybrid drivetrain components.
              </p>
              <ul className="text-xs text-slate-300 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Computerized ECU & OBD-II fault isolation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Hydraulic brake caliper & rotor resurfacing
                </li>
              </ul>
            </div>

            {/* Card 2: Vehicle Maintenance */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/15 text-emerald-400 flex items-center justify-center mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Vehicle Maintenance</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Factory-specified interval maintenance routines preserving your vehicle warranty, extending engine longevity, and optimizing fuel efficiency.
              </p>
              <ul className="text-xs text-slate-300 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Full synthetic 5W-30/0W-20 oil & OEM filter flush
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Transmission, coolant, and brake fluid replacement
                </li>
              </ul>
            </div>

            {/* Card 3: Professional Technicians */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-purple-600/15 text-purple-400 flex items-center justify-center mb-5 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Professional Technicians</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Factory-trained, ASE-certified master mechanics with decades of hands-on expertise across Japanese, American, and European platforms.
              </p>
              <ul className="text-xs text-slate-300 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Master hybrid and auto-electrical specialists
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Ongoing manufacturer service bulletin training
                </li>
              </ul>
            </div>

            {/* Card 4: Vehicle Inspection */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-amber-600/15 text-amber-400 flex items-center justify-center mb-5 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Vehicle Inspection</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Comprehensive 60-point multi-point digital inspection reports documenting tire tread, brake lining, chassis integrity, and fluid health.
              </p>
              <ul className="text-xs text-slate-300 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  High-definition before-and-after photo evidence
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Pre-purchase and long-distance road trip checks
                </li>
              </ul>
            </div>

            {/* Card 5: Genuine Parts */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-sky-600/15 text-sky-400 flex items-center justify-center mb-5 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Genuine Parts</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Direct procurement from authorized OEM suppliers and certified tier-1 manufacturers. Every component is backed by full warranty coverage.
              </p>
              <ul className="text-xs text-slate-300 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Authentic serialized parts with manufacturer barcode
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  12-Month / 20,000 km replacement guarantee
                </li>
              </ul>
            </div>

            {/* Card 6: Transparent Billing */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-rose-600/15 text-rose-400 flex items-center justify-center mb-5 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Transparent Billing</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                No surprises or hidden line items. Clear upfront estimates, customer approval before any additional work, and detailed parts itemization.
              </p>
              <ul className="text-xs text-slate-300 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Instant digital invoices accessible 24/7 on portal
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Flexible payment options: Card, ABA Pay, Counter
                </li>
              </ul>
            </div>
          </div>

          {/* "Why Choose CarSV?" Highlight Bar */}
          <div className="mt-16 bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 p-8 rounded-3xl border border-blue-900/40 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              <div className="space-y-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">The CarSV Advantage</span>
                <h4 className="text-2xl font-black text-white">Why Choose CarSV?</h4>
                <p className="text-slate-300 text-sm">
                  We eliminated the friction, anxiety, and opacity of traditional car repair by giving vehicle owners full digital visibility.
                </p>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                  <div className="text-blue-400 font-bold text-sm mb-1 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-red-400" />
                    <span>Repair progress in your portal</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    After check-in, your portal shows the job status, assigned mechanic, and parts used. No bay camera is connected.
                  </p>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                  <div className="text-blue-400 font-bold text-sm mb-1 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Permanent Digital Logbook</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Never lose paper receipts. Every inspection, torque spec, and oil type is securely stored in your personal account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Services Section (Consumed dynamically from database table) */}
      <section id="services" className="py-20 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Transparent Automotive Services</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Our Service Catalog & Upfront Pricing
              </h2>
              <p className="text-slate-400 text-base mt-2 max-w-xl">
                These are the jobs you can book without an account. Starting prices come from the workshop catalog.
                {isAuthenticated
                  ? ' Your portal adds parts in stock, your vehicles, and your invoices.'
                  : ' Sign in for parts in stock, your vehicles, and your invoices.'}
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : greyChip
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className="bg-slate-900 rounded-3xl border border-slate-800/90 overflow-hidden flex flex-col justify-between hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 hover:-translate-y-1 group"
              >
                {/* Real Service Photography Header */}
                <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
                  <img
                    src={service.imageUrl || '/media/services/service-oil-change.jpg'}
                    alt={service.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/media/services/service-oil-change.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />

                  {/* Top Category Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase bg-slate-950/85 backdrop-blur-md text-blue-300 border border-blue-500/30 shadow-md">
                      {service.category}
                    </span>
                  </div>

                  {/* Top Duration Badge */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-950/85 backdrop-blur-md text-slate-200 border border-slate-700/80 flex items-center gap-1 shadow-md">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{service.estimatedDurationHours ? `${service.estimatedDurationHours * 60} mins` : '45 mins'}</span>
                    </span>
                  </div>

                  {/* Bottom Genuine Workshop Photo Badge */}
                  <div className="absolute bottom-2.5 left-3">
                    <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-700/60 flex items-center gap-1">
                      <Camera className="w-2.5 h-2.5 text-blue-400" />
                      <span>Certified Bay Service</span>
                    </span>
                  </div>

                  {/* Performed count badge */}
                  {service.timesPerformed > 0 && (
                    <div className="absolute bottom-2.5 right-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-950/85 backdrop-blur-md text-emerald-300 border border-emerald-500/30">
                        {service.timesPerformed}+ completed
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1 mb-2">
                      {service.name}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed">
                      {service.description}
                    </p>

                    {service.requiredParts && service.requiredParts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {service.requiredParts.map((part, pidx) => (
                          <span
                            key={pidx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400 font-mono"
                          >
                            {part}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800/80">
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-xs text-slate-400 font-medium">Starting from</span>
                      <span className="text-2xl font-black text-white tracking-tight">
                        ${service.basePrice.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenBooking(service.id)}
                      className="w-full py-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-blue-500/30 hover:border-blue-600 shadow-sm"
                    >
                      <span>Book Service</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Notice under services */}
          <div className="mt-10 text-center text-xs text-slate-400">
            Need a custom mechanical diagnosis or specific parts quote?{' '}
            <button
              onClick={() => onOpenBooking()}
              className="text-blue-400 font-semibold hover:underline cursor-pointer"
            >
              Book a free intake assessment →
            </button>
          </div>
        </div>
      </section>

      {/* 5. How It Works (The 5-Step Customer Journey) */}
      <section id="how-it-works" className="py-20 bg-slate-900/40 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">Simple 5-Step Experience</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How CarSV Works for You
            </h2>
            <p className="text-slate-400 text-base">
              From online booking to key handover, follow every step seamlessly from your smartphone or laptop.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {/* Step 1 */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center mb-4 shadow-md shadow-blue-600/30">
                1
              </div>
              <h4 className="font-bold text-white text-base mb-1.5">Book Online</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose your vehicle, select desired services, and pick an appointment slot that fits your schedule.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center mb-4 shadow-md shadow-blue-600/30">
                2
              </div>
              <h4 className="font-bold text-white text-base mb-1.5">Digital Intake</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Our staff inspects your vehicle upon arrival and uploads a 60-point condition report with photos to your portal.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center mb-4 shadow-md shadow-blue-600/30">
                3
              </div>
              <h4 className="font-bold text-white text-base mb-1.5">Live Bay Tracking</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Follow the job status in your portal after the garage checks the vehicle in. No bay camera is connected.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center mb-4 shadow-md shadow-blue-600/30">
                4
              </div>
              <h4 className="font-bold text-white text-base mb-1.5">Itemized Invoice</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review transparent parts and labor breakdowns with zero hidden markups. Pay online or securely in person.
              </p>
            </div>

            {/* Step 5 */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 relative">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-4 shadow-md shadow-emerald-600/30">
                5
              </div>
              <h4 className="font-bold text-white text-base mb-1.5">Pickup & History</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Collect your washed car with confidence. All diagnostic documents and warranties stay in your permanent account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Live Bay Transparency & Customer Portal Showcase */}
      <section id="transparency" className="py-20 border-b border-slate-800/80 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="keep-on-dark bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 p-8 sm:p-12 rounded-3xl border border-slate-800 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>Real-Time Customer Transparency</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Follow Your Repair in the Customer Portal
                </h2>

                <p className="text-white text-base leading-relaxed">
                  After the garage opens a job, the portal shows status, the assigned mechanic, and the parts used on your vehicle. No bay camera is connected.
                </p>

                <div className="space-y-3 text-sm text-white">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Real-time milestone progress bar (Intake → Diagnosis → Active Work → QA Road Test)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Technician identity, task status, and exact parts installed</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Digital vehicle health inspection reports with high-res photos</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-4">
                  <button
                    onClick={onEnterCustomerPortal}
                    className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Open customer portal</span>
                  </button>

                  <button
                    onClick={() => onOpenAuth('REGISTER')}
                    className={`px-6 py-3.5 rounded-xl font-semibold text-sm border transition-all cursor-pointer ${greyBtn}`}
                  >
                    Create Free Account
                  </button>
                </div>
              </div>

              {/* Interactive Visual: Live Bay View Preview */}
              <div className="lg:col-span-6">
                <div className="bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative">
                  <div className="p-3 bg-black flex items-center justify-between border-b border-white/10 text-xs">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-red-500 animate-pulse" />
                      <span className="font-bold text-white">Bay camera</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono font-bold border border-slate-700">
                      No feed
                    </span>
                  </div>

                  <div className="relative aspect-video">
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-300">
                      No bay camera is connected.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Workshop Facilities & Certifications */}
      <section className="py-20 bg-slate-900/50 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Facility Standards</span>
            <h2 className="text-3xl font-extrabold text-white mt-1">State-of-the-Art Workshop Facility</h2>
            <p className="text-slate-400 text-sm mt-2">
              Equipped with computerized diagnostic scanners, 3D laser alignment racks, and specialized tooling.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
              <img
                src="/media/services/service-oil-change.jpg"
                alt="Hydraulic Lifts"
                className="w-full h-44 object-cover"
              />
              <div className="p-4">
                <h4 className="font-bold text-white text-base">8 Hydraulic Service Bays</h4>
                <p className="text-xs text-slate-400 mt-1">
                  High-capacity lifts handling sedans, luxury SUVs, and light commercial fleet vehicles.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
              <img
                src="/media/vehicles/white-audi-suv-snow-road.jpg"
                alt="3D Laser Alignment"
                className="w-full h-44 object-cover"
              />
              <div className="p-4">
                <h4 className="font-bold text-white text-base">3D Laser Wheel Alignment</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Computerized camber, caster, and toe-in calibration within 0.01mm tolerance specs.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
              <img
                src="/media/vehicles/silver-bmw-coupe-sunset.jpg"
                alt="OBD Diagnostics"
                className="w-full h-44 object-cover"
              />
              <div className="p-4">
                <h4 className="font-bold text-white text-base">OEM Diagnostic Scanners</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Direct factory software for Toyota Techstream, Ford IDS, and Euro OBD-II platforms.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
              <img
                src="/media/blog/cafe-interior-broel.jpg"
                alt="Customer Lounge"
                className="w-full h-44 object-cover"
              />
              <div className="p-4">
                <h4 className="font-bold text-white text-base">VIP Customer Lounge</h4>
                <p className="text-xs text-slate-400 mt-1">
                  A waiting area with Wi-Fi while the car is in the workshop.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Verified Customer Reviews */}
      <section className="py-20 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-extrabold text-white mt-2">What Our Customers Say</h2>
            <p className="text-slate-400 text-sm mt-1">
              No customer reviews are published yet.
            </p>
          </div>
        </div>
      </section>

      {/* 9. Blog teaser — full journal lives on its own public page */}
      <section id="blog" className={`py-16 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-200 bg-slate-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`rounded-3xl border overflow-hidden grid lg:grid-cols-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="p-8 flex flex-col justify-center">
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                <BookOpen className="w-4 h-4 inline mr-1.5" />
                From the CarSV Blog
              </p>
              <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {featuredPost ? featuredPost.title : 'No articles are published'}
              </h2>
              <p className={`text-sm leading-relaxed mt-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {featuredPost
                  ? featuredPost.excerpt
                  : 'The workshop has not published a journal entry yet. The service catalog above is still the list of what you can book.'}
              </p>
              <button
                type="button"
                onClick={goToBlog}
                className="mt-6 inline-flex items-center gap-2 self-start px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold"
              >
                Open the Blog
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {featuredPost?.image ? (
              <button type="button" onClick={goToBlog} className="min-h-56">
                <img src={featuredPost.image} alt={featuredPost.title} className="w-full h-full object-cover min-h-56" />
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* 10. Contact & Location Information */}
      <section id="contact" className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Get in Touch</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Visit Our Workshop or Book a Service Today
              </h2>
              <p className="text-slate-300 text-base leading-relaxed">
                Our central service hub is conveniently located on St. 271 with easy arterial access. Drop by for a free preliminary multi-point check or schedule your repair slot online.
              </p>

              <div className="space-y-4 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Main Workshop Location</div>
                    <div className="text-slate-400 text-xs">St. 271, Sangkat Boeung Tumpun, Khan Meanchey, Phnom Penh</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Direct Service & Booking Line</div>
                    <div className="text-slate-400 text-xs">+855 12 888 901 / +855 23 990 122</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Customer Support & Inquiries</div>
                    <div className="text-slate-400 text-xs">care@carsv.com • WhatsApp / Telegram: @CarSVCare</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Operating Hours & Appointment Quick Card */}
            <div className="lg:col-span-6 bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              <h3 className="text-xl font-bold text-white">Operating Schedule</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                  <span className="font-medium">Monday – Friday</span>
                  <span className="text-emerald-400 font-semibold font-mono">07:30 AM – 06:30 PM</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                  <span className="font-medium">Saturday</span>
                  <span className="text-emerald-400 font-semibold font-mono">07:30 AM – 05:00 PM</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                  <span className="font-medium">Sunday</span>
                  <span className="text-blue-400 font-semibold font-mono">08:00 AM – 02:00 PM (Emergency Service)</span>
                </div>
              </div>

              <div className="pt-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800 text-center space-y-3">
                <div className="font-bold text-white">Ready for seamless vehicle maintenance?</div>
                <button
                  onClick={() => onOpenBooking()}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Your Service Online Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </CustomerPublicShell>
  );
};
