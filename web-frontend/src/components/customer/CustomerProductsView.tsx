import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Car,
  Search,
  Check,
  X,
  Shield,
  Star,
  DollarSign,
  ChevronRight,
  ArrowRight,
  ShoppingBag,
  Eye,
  SlidersHorizontal,
  Info,
  Calendar,
  ThumbsUp,
  Camera,
  Barcode,
  Factory,
  MapPin,
  Weight,
  Globe,
  Box,
  Hash
} from 'lucide-react';
import { createCustomerPartRequest, CustomerPartRequestRow, listCustomerPartRequests } from '../../api/garage';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import { Appointment, InventoryPart } from '../../types';

type ProductSpec = { label: string; value: string };

export interface CompanyProduct {
  id: string;
  name: string;
  brand: string;
  sku: string;
  category: string;
  description: string;
  features: string[];
  price: number;
  installEstimate?: number;
  availability: 'IN_STOCK' | 'LOW_STOCK' | 'AVAILABLE_ON_ORDER';
  stockCount: number;
  imageUrl: string;
  rating: number;
  reviewsCount: number;
  warranty: string;
  compatibleBrands: string[];
  compatibleModelsDescription: string;
  recommendedForBrands: string[];
  recommendationReason?: string;
  oemPartNumber: string;
  barcode: string;
  manufacturer: string;
  countryOfOrigin: string;
  condition: 'Brand New';
  unitOfMeasure: string;
  netWeight: string;
  packageDimensions: string;
  material: string;
  position?: string;
  certifications: string[];
  includedInBox: string[];
  specifications: ProductSpec[];
  serviceInterval?: string;
  leadTimeDays: number;
  warehouseBin: string;
  hsCode: string;
  notes: string;
}

function stockPart(part: InventoryPart): CompanyProduct {
  return {
    id: part.id,
    name: part.name,
    brand: part.supplierName,
    sku: part.sku,
    category: part.location || 'Parts',
    description: part.location ? `${part.name} (${part.location})` : part.name,
    features: [],
    price: part.unitPrice,
    availability: part.stockQuantity > 0 ? 'IN_STOCK' : 'LOW_STOCK',
    stockCount: part.stockQuantity,
    imageUrl: part.imageUrl || '',
    rating: 0,
    reviewsCount: 0,
    warranty: '',
    compatibleBrands: [],
    compatibleModelsDescription: '',
    recommendedForBrands: [],
    oemPartNumber: part.sku,
    barcode: '',
    manufacturer: part.supplierName,
    countryOfOrigin: '',
    condition: 'Brand New',
    unitOfMeasure: 'each',
    netWeight: '',
    packageDimensions: '',
    material: '',
    certifications: [],
    includedInBox: [],
    specifications: part.location ? [{ label: 'Category', value: part.location }] : [],
    leadTimeDays: 0,
    warehouseBin: '',
    hsCode: '',
    notes: part.stockQuantity > 0 ? `${part.stockQuantity} in stock` : 'Out of stock',
  };
}

const FULFILLMENT_LABEL: Record<string, string> = {
  INSTALL_IN_WORKSHOP: 'Workshop install',
  PICKUP_AT_COUNTER: 'Counter pickup',
  DELIVERY: 'Delivery',
};

const REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  NOTED: 'Noted by the garage',
  CONFIRMED: 'Confirmed',
};

interface CustomerProductsViewProps {
  onNavigateTab?: (tab: any) => void;
  onOpenBookAppointment?: (serviceId?: string) => void;
}

export const CustomerProductsView: React.FC<CustomerProductsViewProps> = ({
  onNavigateTab,
  onOpenBookAppointment
}) => {
  const { vehicles, currentUser, addToast, inventory, workOrders, appointments, refreshCustomerPortal } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const quoteBookingId = searchParams.get('booking') || '';
  const quoteVehicleId = searchParams.get('vehicle') || '';
  const quoteJob = searchParams.get('job') || '';
  const quoteFulfillment = searchParams.get('fulfillment') || '';

  const catalog = useMemo(() => (inventory || []).map(stockPart), [inventory]);
  const categoryChoices = useMemo(
    () => ['ALL', ...Array.from(new Set(catalog.map((product) => product.category).filter(Boolean)))],
    [catalog]
  );
  const brandChoices = useMemo(
    () => ['ALL', ...Array.from(new Set((vehicles || []).map((vehicle) => vehicle.brand).filter(Boolean)))],
    [vehicles]
  );

  const myVehicles = useMemo(() => {
    return (vehicles || []).filter((vehicle) => belongsToCurrentCustomer(currentUser, vehicle));
  }, [vehicles, currentUser]);

  const defaultCar = myVehicles[0] || {
    id: '',
    brand: '',
    model: '',
    licensePlate: '',
  };
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('ALL');
  const [shelfMode, setShelfMode] = useState<'ALL_STOCK' | 'USED'>('ALL_STOCK');

  // State
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<'ALL' | 'RECOMMENDED_ONLY'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Request & Details Modal
  const [requestVehicleId, setRequestVehicleId] = useState<string>(defaultCar.id || '');

  // Form State for Request
  const [selectedCarForRequest, setSelectedCarForRequest] = useState<string>(
    `${defaultCar.brand} ${defaultCar.model} (${defaultCar.licensePlate})`
  );
  const [requestDeliveryOption, setRequestDeliveryOption] = useState('INSTALL_IN_WORKSHOP');
  const [requestBookingId, setRequestBookingId] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [requestProduct, setRequestProduct] = useState<CompanyProduct | null>(null);
  const [activeDetailProduct, setActiveDetailProduct] = useState<CompanyProduct | null>(null);
  const [showRequestsDrawer, setShowRequestsDrawer] = useState(false);
  const [submittedRequests, setSubmittedRequests] = useState<CustomerPartRequestRow[]>([]);
  const [requestSending, setRequestSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listCustomerPartRequests()
      .then((rows) => {
        if (!cancelled) setSubmittedRequests(rows);
      })
      .catch(() => {
        if (!cancelled) setSubmittedRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (quoteVehicleId) {
      setRequestVehicleId(quoteVehicleId);
      setSelectedVehicleId(quoteVehicleId);
      setShelfMode('ALL_STOCK');
    }
    if (quoteBookingId) setRequestBookingId(quoteBookingId);
    if (quoteFulfillment) setRequestDeliveryOption(quoteFulfillment);
  }, [quoteVehicleId, quoteBookingId, quoteFulfillment]);

  const openVisitsForVehicle = (vehicleId: string): Appointment[] =>
    (appointments || []).filter(
      (row) =>
        row.vehicleId === vehicleId &&
        row.status !== 'CANCELLED' &&
        row.status !== 'COMPLETED' &&
        row.status !== 'NO_SHOW'
    );

  const bookingLabel = (row: Appointment) => {
    const when = [row.date, row.time].filter(Boolean).join(' ');
    const status = row.statusLabel || row.status;
    return `BK-${row.id.padStart(4, '0')} · ${row.serviceName || 'Visit'}${when ? ` · ${when}` : ''}${
      status ? ` · ${status}` : ''
    }`;
  };

  const openPartRequest = (product: CompanyProduct) => {
    const vehicleId = quoteVehicleId || myVehicles[0]?.id || '';
    const visits = vehicleId ? openVisitsForVehicle(vehicleId) : [];
    setRequestVehicleId(vehicleId);
    setRequestDeliveryOption(quoteFulfillment || 'INSTALL_IN_WORKSHOP');
    setRequestBookingId(quoteBookingId || visits[0]?.id || '');
    setRequestNotes('');
    setRequestProduct(product);
  };
  const selectedVehicle = myVehicles.find((vehicle) => vehicle.id === selectedVehicleId) || null;

  const usedSkus = useMemo(() => {
    const skus = new Set<string>();
    if (!selectedVehicle) return skus;
    for (const order of workOrders || []) {
      if (order.vehicleId !== selectedVehicle.id) continue;
      for (const part of order.partsUsed || []) {
        if (part.partNumber) skus.add(part.partNumber);
      }
    }
    return skus;
  }, [workOrders, selectedVehicle]);

  const selectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setShelfMode(vehicleId === 'ALL' ? 'ALL_STOCK' : 'USED');
  };

  // Quick select customer registered vehicle
  const handleSelectCustomerCar = (carBrand: string) => {
    setSelectedBrand(carBrand);
  };

  // Filtered products calculation
  const filteredProducts = useMemo(() => {
    return catalog.filter((product) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          product.name.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.compatibleModelsDescription.toLowerCase().includes(query) ||
          product.oemPartNumber.toLowerCase().includes(query) ||
          product.barcode.toLowerCase().includes(query) ||
          product.manufacturer.toLowerCase().includes(query) ||
          product.countryOfOrigin.toLowerCase().includes(query) ||
          product.material.toLowerCase().includes(query) ||
          product.notes.toLowerCase().includes(query) ||
          product.specifications.some((s) => `${s.label} ${s.value}`.toLowerCase().includes(query));

        if (!matchesQuery) return false;
      }

      if (selectedVehicle && shelfMode === 'USED' && !usedSkus.has(product.sku)) {
        return false;
      }

      return true;
    });
  }, [catalog, searchQuery, selectedCategory, selectedVehicle, shelfMode, usedSkus]);

  const handleConfirmRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestProduct || requestSending) return;
    const install = requestDeliveryOption === 'INSTALL_IN_WORKSHOP';
    const visits = requestVehicleId ? openVisitsForVehicle(requestVehicleId) : [];
    if (install && visits.length > 0 && !requestBookingId) {
      addToast({
        type: 'error',
        title: 'Choose a booking',
        message: 'This car has more than one open visit. Pick which booking this part belongs to.',
      });
      return;
    }
    setRequestSending(true);
    try {
      const saved = await createCustomerPartRequest({
        sparePartId: requestProduct.id,
        vehicleId: requestVehicleId || undefined,
        bookingId: install ? requestBookingId || undefined : undefined,
        fulfillment: requestDeliveryOption,
        notes: requestNotes,
      });
      setSubmittedRequests((rows) => [saved, ...rows.filter((row) => row.id !== saved.id)]);
      setRequestProduct(null);
      setRequestNotes('');
      await refreshCustomerPortal();
      addToast({
        type: 'success',
        title: install ? 'Part linked to the visit' : 'Purchase request sent',
        message: install
          ? `${saved.productName} is on ${saved.bookingId ? `booking BK-${saved.bookingId.padStart(4, '0')}` : 'your open visit'}. It appears on that visit quote.`
          : `${saved.productName} is saved as ${saved.number}. Confirm it on Quotes, then the garage prepares the invoice and handoff.`,
      });
      if (quoteJob || quoteBookingId) {
        setSearchParams({});
        navigate(quoteJob ? `/quotes?job=${encodeURIComponent(quoteJob)}` : '/quotes');
      } else {
        setShowRequestsDrawer(true);
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Request was not sent',
        message: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setRequestSending(false);
    }
  };

  const requestVisits = requestVehicleId ? openVisitsForVehicle(requestVehicleId) : [];
  const selectedRequestBooking = requestVisits.find((row) => row.id === requestBookingId) || null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {(quoteBookingId || quoteJob) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-amber-100">
            <span className="font-bold text-white">Adding a part to a quote.</span>{' '}
            {quoteBookingId ? `Booking BK-${quoteBookingId.padStart(4, '0')}` : 'Open visit'}
            {quoteJob ? ` · ${quoteJob}` : ''}. Choose Workshop Install and submit — it stays on that booking.
          </div>
          <button
            type="button"
            onClick={() => navigate(quoteJob ? `/quotes?job=${encodeURIComponent(quoteJob)}` : '/quotes')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-xs font-bold text-white border border-slate-700"
          >
            Back to quote
          </button>
        </div>
      )}

      {/* 1. HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Package className="w-5 h-5" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Equipment for Sales
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {catalog.length} Total SKUs
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Parts & Products Catalog
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mt-1">
            {catalog.length} parts currently in garage stock. Prices and quantities come from the warehouse.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRequestsDrawer(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <ShoppingBag className="w-4 h-4 text-blue-400" />
            <span>My Part Requests</span>
            <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-[10px] font-bold text-white">
              {submittedRequests.length}
            </span>
          </button>

          {onOpenBookAppointment && (
            <button
              onClick={() => onOpenBookAppointment()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-blue-200" />
              <span>Book Installation</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. VEHICLE + SHELF FILTER */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">Parts for your vehicles</h2>
                {selectedVehicle && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {selectedVehicle.licensePlate}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Pick one of your cars to see parts already fitted on it, or browse every part in stock.
              </p>
            </div>
          </div>

          {myVehicles.length > 0 && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-slate-400 font-medium shrink-0">My Vehicles:</span>
              <div className="tab-scroll min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => selectVehicle('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    !selectedVehicle
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500'
                      : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  Full shelf
                </button>
                {myVehicles.map((veh) => {
                  const isSelected = selectedVehicle?.id === veh.id;
                  return (
                    <button
                      key={veh.id}
                      type="button"
                      onClick={() => selectVehicle(veh.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500'
                          : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>{veh.brand}</span>
                      <span className="text-[10px] opacity-75">({veh.model})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {selectedVehicle && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 border border-amber-500/30">
                    {usedSkus.size} used on this car
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  The count is parts recorded on repair jobs for {selectedVehicle.licensePlate}. The full shelf is every part currently in stock.
                </p>
              </div>
            </div>

            <div className="tab-scroll bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 max-w-full">
              <button
                type="button"
                onClick={() => setShelfMode('USED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  shelfMode === 'USED' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Used on this car ({usedSkus.size})
              </button>
              <button
                type="button"
                onClick={() => setShelfMode('ALL_STOCK')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  shelfMode === 'ALL_STOCK' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Full shelf ({catalog.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. SEARCH & CATEGORY FILTER ROW */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, brand, SKU, OEM number, barcode, origin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {(selectedVehicle || selectedCategory !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedVehicleId('ALL');
                setShelfMode('ALL_STOCK');
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="tab-scroll pb-1 text-xs font-semibold">
          {categoryChoices.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. PRODUCTS CATALOG GRID */}
      {filteredProducts.length === 0 ? (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-12 text-center space-y-4 shadow-xl">
          <p className="text-sm text-slate-300">
            {selectedVehicle && shelfMode === 'USED'
              ? `No parts have been recorded on the ${selectedVehicle.brand} ${selectedVehicle.model} yet.`
              : 'No parts in stock matched this search.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedVehicleId('ALL');
              setShelfMode('ALL_STOCK');
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors cursor-pointer"
          >
            Show all parts
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const usedOnSelectedVehicle = Boolean(selectedVehicle && usedSkus.has(product.sku));
            return (
              <div
                key={product.id}
                className="bg-slate-900 rounded-3xl border border-slate-800 hover:border-slate-700 flex flex-col justify-between overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1 group"
              >
                {/* Product Image & Badges */}
                <div
                  onClick={() => setActiveDetailProduct(product)}
                  className="relative h-56 bg-slate-950 overflow-hidden cursor-pointer"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).style.opacity = '0.4';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  {/* Brand & Category Overlays */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-950/80 backdrop-blur-md text-white border border-slate-700 shadow-md">
                      {product.brand}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-blue-950/80 backdrop-blur-md text-blue-300 border border-blue-500/30 shadow-md">
                      {product.category}
                    </span>
                    <span className="px-2 py-1 rounded-lg text-[9px] font-bold bg-slate-900/85 backdrop-blur-md text-slate-300 border border-slate-700/80 flex items-center gap-1 shadow-md">
                      <Camera className="w-2.5 h-2.5 text-blue-400" />
                      <span>Genuine Photo</span>
                    </span>
                  </div>

                  {/* Stock Availability Badge */}
                  <div className="absolute top-3 right-3">
                    {product.availability === 'IN_STOCK' && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/90 backdrop-blur-md text-slate-950 flex items-center gap-1 shadow-md">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>In Stock ({product.stockCount})</span>
                      </span>
                    )}
                    {product.availability === 'LOW_STOCK' && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/90 backdrop-blur-md text-slate-950 flex items-center gap-1 shadow-md">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Low Stock ({product.stockCount} left)</span>
                      </span>
                    )}
                    {product.availability === 'AVAILABLE_ON_ORDER' && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-500/90 backdrop-blur-md text-slate-950 flex items-center gap-1 shadow-md">
                        <Clock className="w-3 h-3" />
                        <span>Available on Order</span>
                      </span>
                    )}
                  </div>
                  {usedOnSelectedVehicle && selectedVehicle && (
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-lg">
                        <Wrench className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Used on {selectedVehicle.brand} {selectedVehicle.model}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    {/* SKU & Ratings */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono text-[11px] text-slate-400">SKU: {product.sku}</span>
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{product.rating}</span>
                        <span className="text-slate-500 font-normal">({product.reviewsCount})</span>
                      </div>
                    </div>

                    {/* Product Name */}
                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors leading-snug">
                      {product.name}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-400 font-medium">
                      <span className="truncate">OEM: {product.oemPartNumber}</span>
                      <span className="truncate">Made in {product.countryOfOrigin}</span>
                    </div>
                    {product.compatibleBrands.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Car className="w-3 h-3 text-blue-400" />
                          <span>Compatible Car Brands:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {product.compatibleBrands.map((brand) => (
                            <span
                              key={brand}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800"
                            >
                              {brand}
                            </span>
                          ))}
                        </div>
                        {product.compatibleModelsDescription ? (
                          <p className="text-[11px] text-slate-400 italic truncate">
                            {product.compatibleModelsDescription}
                          </p>
                        ) : null}
                      </div>
                    )}

                    {/* Recommendation Reason Note */}
                    {product.recommendationReason && (
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                        <ThumbsUp className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{product.recommendationReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Price & Action Footer */}
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">
                          Price
                        </div>
                        <div className="text-xl font-black text-white">
                          ${product.price.toFixed(2)}
                        </div>
                      </div>

                      {product.installEstimate && (
                        <div className="text-right text-[11px] text-slate-400">
                          <span>Installation: </span>
                          <span className="text-blue-400 font-bold">
                            +${product.installEstimate.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: View Details & Request Part */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setActiveDetailProduct(product)}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Specs & Fit</span>
                      </button>

                      <button
                        onClick={() => openPartRequest(product)}
                        className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Request Part</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. REQUEST / APPROVE PART MODAL */}
      {requestProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 sm:rounded-3xl rounded-t-3xl max-w-lg w-full p-4 sm:p-7 shadow-2xl space-y-6 max-h-[min(92dvh,90vh)] overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0">
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white">Request Part / Product</h3>
                  <p className="text-xs text-slate-400">
                    Allocate this component to your garage record or service visit
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRequestProduct(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Product Summary */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex gap-4">
              <img
                src={requestProduct.imageUrl}
                alt={requestProduct.name}
                className="w-16 h-16 rounded-xl object-cover bg-slate-900 shrink-0"
              />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  {requestProduct.brand} • SKU: {requestProduct.sku}
                </div>
                <h4 className="text-sm font-bold text-white truncate">{requestProduct.name}</h4>
                <div className="text-xs text-slate-300">
                  Part Price: <strong className="text-white">${requestProduct.price.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Vehicle</label>
                <select
                  value={requestVehicleId}
                  onChange={(e) => {
                    const nextVehicle = e.target.value;
                    setRequestVehicleId(nextVehicle);
                    const visits = nextVehicle ? openVisitsForVehicle(nextVehicle) : [];
                    setRequestBookingId(
                      quoteBookingId && visits.some((row) => row.id === quoteBookingId)
                        ? quoteBookingId
                        : visits[0]?.id || ''
                    );
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {myVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} (Plate: {v.licensePlate})
                    </option>
                  ))}
                  <option value="">Other / Unregistered Vehicle</option>
                </select>
              </div>

              {/* Delivery / Installation option */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Fulfillment Method:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'INSTALL_IN_WORKSHOP',
                      title: 'Workshop Install',
                      desc: 'Installed by technician'
                    },
                    {
                      id: 'PICKUP_AT_COUNTER',
                      title: 'Counter Pickup',
                      desc: 'Pick up part yourself'
                    },
                    {
                      id: 'DELIVERY',
                      title: 'Express Delivery',
                      desc: 'Sent to your address'
                    }
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => {
                        setRequestDeliveryOption(opt.id);
                        if (opt.id === 'INSTALL_IN_WORKSHOP' && !requestBookingId && requestVisits[0]) {
                          setRequestBookingId(requestVisits[0].id);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        requestDeliveryOption === opt.id
                          ? 'bg-blue-600/15 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{opt.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {requestDeliveryOption === 'INSTALL_IN_WORKSHOP' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Booking / quote for this car</label>
                  {requestVisits.length === 0 ? (
                    <p className="text-[11px] text-slate-500 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                      No open booking for this vehicle yet. Submit the part anyway, or book a service first — Workshop
                      Install attaches when a visit exists.
                    </p>
                  ) : (
                    <select
                      value={requestBookingId}
                      onChange={(e) => setRequestBookingId(e.target.value)}
                      required={requestVisits.length > 0}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">Choose which visit this part belongs to</option>
                      {requestVisits.map((row) => (
                        <option key={row.id} value={row.id}>
                          {bookingLabel(row)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Special Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Notes / Special Instructions (Optional):
                </label>
                <textarea
                  rows={2}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="e.g. Please check rotor thickness before installing..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Cost Summary */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] text-slate-400">Estimated Total Cost</div>
                  <div className="text-lg font-black text-white">${requestProduct.price.toFixed(2)}</div>
                </div>
                <div className="text-xs text-slate-400 text-right max-w-[14rem]">
                  {requestDeliveryOption === 'INSTALL_IN_WORKSHOP'
                    ? selectedRequestBooking
                      ? `Links to ${bookingLabel(selectedRequestBooking)}`
                      : requestVisits.length > 0
                        ? 'Choose a booking above'
                        : 'No open booking — part waits until a visit exists'
                    : 'Parts-only purchase — confirm on Quotes'}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRequestProduct(null)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  disabled={requestSending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    requestSending ||
                    (requestDeliveryOption === 'INSTALL_IN_WORKSHOP' &&
                      requestVisits.length > 0 &&
                      !requestBookingId)
                  }
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{requestSending ? 'Sending…' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. PRODUCT DETAILS & FITMENT SPECS MODAL */}
      {activeDetailProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{activeDetailProduct.name}</h3>
                  <p className="text-xs text-slate-400">
                    {activeDetailProduct.brand} • SKU: {activeDetailProduct.sku}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveDetailProduct(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Product Image & Key Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="h-60 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative group">
                <img
                  src={activeDetailProduct.imageUrl}
                  alt={activeDetailProduct.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2.5 left-2.5">
                  <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-950/80 backdrop-blur-md text-slate-200 border border-slate-700/80 flex items-center gap-1.5 shadow-md">
                    <Camera className="w-3 h-3 text-blue-400" />
                    <span>Real Stock Studio Photography</span>
                  </span>
                </div>
              </div>

              <div className="space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="text-2xl font-black text-white">
                    ${activeDetailProduct.price.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>In Stock at Main Workshop Warehouse</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>{activeDetailProduct.warranty}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {activeDetailProduct.compatibleBrands.join(', ') || 'Catalog part'}
                  </div>
                </div>
                {activeDetailProduct.compatibleBrands.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Vehicle Brand Compatibility
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activeDetailProduct.compatibleBrands.map((b) => (
                        <span
                          key={b}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    openPartRequest(activeDetailProduct);
                    setActiveDetailProduct(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Request / Order This Part</span>
                </button>
              </div>
            </div>

            {/* Description & Features */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Product Description
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeDetailProduct.description}
              </p>
              {activeDetailProduct.notes && (
                <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-blue-500/40 pl-3">
                  {activeDetailProduct.notes}
                </p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {[
                  { icon: Barcode, label: 'Barcode', value: activeDetailProduct.barcode },
                  { icon: Hash, label: 'OEM / OE', value: activeDetailProduct.oemPartNumber },
                  { icon: Factory, label: 'Manufacturer', value: activeDetailProduct.manufacturer },
                  { icon: Globe, label: 'Origin', value: activeDetailProduct.countryOfOrigin },
                  { icon: MapPin, label: 'Warehouse', value: activeDetailProduct.warehouseBin },
                  { icon: Weight, label: 'Net weight', value: activeDetailProduct.netWeight }
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                        <Icon className="w-3 h-3 text-blue-400" />
                        {row.label}
                      </div>
                      <div className="text-slate-200 font-semibold leading-snug">{row.value}</div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  Pack: {activeDetailProduct.packageDimensions} · {activeDetailProduct.unitOfMeasure}
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  Material: {activeDetailProduct.material}
                </div>
                {activeDetailProduct.position && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    Position: {activeDetailProduct.position}
                  </div>
                )}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  HS code {activeDetailProduct.hsCode} · Lead time {activeDetailProduct.leadTimeDays} day
                  {activeDetailProduct.leadTimeDays === 1 ? '' : 's'}
                </div>
                {activeDetailProduct.serviceInterval && (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 col-span-2">
                    Service interval: {activeDetailProduct.serviceInterval}
                  </div>
                )}
              </div>

              <h4 className="text-xs font-bold text-white uppercase tracking-wider pt-2">
                Technical specifications
              </h4>
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                {activeDetailProduct.specifications.map((spec, idx) => (
                  <div
                    key={spec.label}
                    className={`flex items-start justify-between gap-3 px-3 py-2 text-xs ${
                      idx % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900'
                    }`}
                  >
                    <span className="text-slate-400 shrink-0">{spec.label}</span>
                    <span className="text-slate-200 font-semibold text-right">{spec.value}</span>
                  </div>
                ))}
              </div>

              <h4 className="text-xs font-bold text-white uppercase tracking-wider pt-2">
                Engineered Features
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                {activeDetailProduct.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <Box className="w-3.5 h-3.5 text-blue-400" />
                    In the box
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {activeDetailProduct.includedInBox.map((item) => (
                      <li key={item} className="flex gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    Certifications · {activeDetailProduct.condition}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {activeDetailProduct.certifications.map((c) => (
                      <span
                        key={c}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600/15 text-blue-300 border border-blue-500/30"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">{activeDetailProduct.warranty}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MY REQUESTED PARTS SLIDE-OVER DRAWER */}
      {showRequestsDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full max-h-[100dvh] p-4 sm:p-6 space-y-6 flex flex-col justify-between overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="space-y-5 min-w-0">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShoppingBag className="w-5 h-5 text-blue-400 shrink-0" />
                  <h3 className="text-base font-bold text-white truncate">My Requested Parts</h3>
                </div>
                <button
                  onClick={() => setShowRequestsDrawer(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-400">Requests you send appear here and in the garage admin.</p>

              {submittedRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Package className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="text-xs">You haven't requested any parts yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submittedRequests.map((req) => (
                    <div key={req.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-slate-400">{req.number}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          req.status === 'CONFIRMED'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : req.status === 'NOTED'
                              ? 'bg-sky-500/20 text-sky-700 border-sky-500/30'
                              : 'bg-amber-500/20 text-amber-700 border-amber-500/30'
                        }`}>
                          {REQUEST_STATUS_LABEL[req.status] || req.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{req.productName}</h4>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between gap-3">
                        <span>
                          {req.vehiclePlate ? `${req.carBrand} (${req.vehiclePlate})` : req.carBrand}
                          {' · '}
                          {FULFILLMENT_LABEL[req.fulfillment] || req.fulfillment}
                        </span>
                        <strong className="text-white">${req.price.toFixed(2)}</strong>
                      </div>
                      {req.status === 'CONFIRMED' && req.workOrderNumber ? (
                        <div className="pt-2 border-t border-slate-800 space-y-2">
                          <p className="text-[11px] text-slate-300">
                            On {req.workOrderNumber}
                            {req.invoiceNumber ? ` · ${req.invoiceNumber}` : ''}
                            {req.invoiceStatus ? ` · ${req.invoiceStatus}` : ''}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Invoice ${req.invoiceTotal.toFixed(2)} · paid ${req.amountPaid.toFixed(2)}. The garage records the payment.
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                refreshCustomerPortal()
                                  .catch(() => {})
                                  .finally(() => navigate(`/tracking?job=${encodeURIComponent(req.workOrderNumber)}&tab=PARTS`));
                              }}
                              className="flex-1 py-2 rounded-lg bg-slate-800 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Work order
                            </button>
                            {req.invoiceNumber && (
                              <button
                                type="button"
                                onClick={() => {
                                  refreshCustomerPortal()
                                    .catch(() => {})
                                    .finally(() => navigate(`/invoices?invoice=${encodeURIComponent(req.invoiceNumber)}`));
                                }}
                                className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Invoice
                              </button>
                            )}
                          </div>
                        </div>
                      ) : req.status === 'CONFIRMED' ? (
                        <p className="text-[11px] text-slate-500">
                          Accepted on your appointment. The garage issues it when the car is checked in.
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Waiting for the garage to confirm. That puts this part on the same visit as your booking.
                        </p>
                      )}
                      {req.customerNotes && (
                        <p className="text-[11px] text-slate-400 italic">"{req.customerNotes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowRequestsDrawer(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
