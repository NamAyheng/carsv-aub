import React, { useState, useMemo } from 'react';
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
  Sparkles,
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
import { useApp } from '../../context/AppContext';
import { demoCustomerId } from '../../utils/customerScope';
import { InvoiceFulfillment } from '../../types';
import {
  ALL_COMPANY_PRODUCTS,
  CAR_BRANDS,
  CompanyProduct
} from '../../data/companyProducts';

export type { CompanyProduct };
export { ALL_COMPANY_PRODUCTS, CAR_BRANDS };

export interface CustomerPartRequest {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  sku: string;
  price: number;
  carBrand: string;
  vehiclePlate: string;
  deliveryOrInstall: 'INSTALL_IN_WORKSHOP' | 'PICKUP_AT_COUNTER' | 'DELIVERY';
  customerNotes?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'READY_FOR_INSTALL';
  requestedAt: string;
}

interface CustomerProductsViewProps {
  onNavigateTab?: (tab: any) => void;
  onOpenBookAppointment?: (serviceId?: string) => void;
}

export const CustomerProductsView: React.FC<CustomerProductsViewProps> = ({
  onNavigateTab,
  onOpenBookAppointment
}) => {
  const { vehicles, currentUser, addToast, createInvoice, invoices } = useApp();

  // Customer registered vehicles
  const myVehicles = useMemo(() => {
    return (vehicles || []).filter(
      (v) =>
        v.customerId === currentUser?.id ||
        v.customerName?.toLowerCase().includes('john') ||
        v.customerName?.toLowerCase().includes('doe') ||
        true
    );
  }, [vehicles, currentUser]);

  const defaultCar = myVehicles[0] || {
    id: 'veh-1',
    brand: 'Toyota',
    model: 'Camry 2.5L XSE',
    year: 2022,
    licensePlate: '2A-9812'
  };

  // State
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<'ALL' | 'RECOMMENDED_ONLY'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Request & Details Modal
  const [activeDetailProduct, setActiveDetailProduct] = useState<CompanyProduct | null>(null);
  const [requestProduct, setRequestProduct] = useState<CompanyProduct | null>(null);
  const [showRequestsDrawer, setShowRequestsDrawer] = useState<boolean>(false);

  // Form State for Request
  const [selectedCarForRequest, setSelectedCarForRequest] = useState<string>(
    `${defaultCar.brand} ${defaultCar.model} (${defaultCar.licensePlate})`
  );
  const [requestDeliveryOption, setRequestDeliveryOption] = useState<
    'INSTALL_IN_WORKSHOP' | 'PICKUP_AT_COUNTER' | 'DELIVERY'
  >('INSTALL_IN_WORKSHOP');
  const [requestNotes, setRequestNotes] = useState<string>('');

  // Submitted Requests
  const [submittedRequests, setSubmittedRequests] = useState<CustomerPartRequest[]>([
    {
      id: 'REQ-1042',
      productId: 'prod-1',
      productName: 'Brembo Ceramic Performance Front Brake Pads',
      brand: 'Brembo',
      sku: 'BRK-BRE-04465',
      price: 78.0,
      carBrand: 'Toyota',
      vehiclePlate: '2A-9812',
      deliveryOrInstall: 'INSTALL_IN_WORKSHOP',
      customerNotes: 'Please install during upcoming 40,000 km service.',
      status: 'APPROVED',
      requestedAt: 'Yesterday'
    }
  ]);

  // Handle car brand selection
  const handleSelectBrand = (brand: string) => {
    setSelectedBrand(brand);
  };

  // Quick select customer registered vehicle
  const handleSelectCustomerCar = (carBrand: string) => {
    setSelectedBrand(carBrand);
  };

  // Filtered products calculation
  const filteredProducts = useMemo(() => {
    return ALL_COMPANY_PRODUCTS.filter((product) => {
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

      // 2. Category Filter
      if (selectedCategory !== 'ALL' && product.category !== selectedCategory) {
        return false;
      }

      // 3. Car Brand Filter & Recommendation
      if (selectedBrand !== 'ALL') {
        const fitsBrand =
          product.compatibleBrands.includes('Universal') ||
          product.compatibleBrands.includes(selectedBrand);

        if (!fitsBrand) return false;

        // If user specifically clicked "Recommended Only" for this brand
        if (filterMode === 'RECOMMENDED_ONLY') {
          const isRecommended =
            product.recommendedForBrands.includes(selectedBrand) ||
            product.recommendedForBrands.includes('Universal');
          if (!isRecommended) return false;
        }
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedBrand, filterMode]);

  // Recommended count for currently selected brand
  const recommendedCountForBrand = useMemo(() => {
    if (selectedBrand === 'ALL') {
      return ALL_COMPANY_PRODUCTS.filter((p) => p.recommendedForBrands.length > 0).length;
    }
    return ALL_COMPANY_PRODUCTS.filter(
      (p) =>
        p.recommendedForBrands.includes(selectedBrand) ||
        p.recommendedForBrands.includes('Universal')
    ).length;
  }, [selectedBrand]);

  // Handle Request Submission
  const handleConfirmRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestProduct) return;

    const newReq: CustomerPartRequest = {
      id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      productId: requestProduct.id,
      productName: requestProduct.name,
      brand: requestProduct.brand,
      sku: requestProduct.sku,
      price: requestProduct.price,
      carBrand: selectedBrand !== 'ALL' ? selectedBrand : defaultCar.brand,
      vehiclePlate: defaultCar.licensePlate,
      deliveryOrInstall: requestDeliveryOption,
      customerNotes: requestNotes,
      status: 'APPROVED',
      requestedAt: 'Just now'
    };

    const fulfillment: InvoiceFulfillment =
      requestDeliveryOption === 'DELIVERY'
        ? 'DELIVERY'
        : requestDeliveryOption === 'INSTALL_IN_WORKSHOP'
          ? 'WORKSHOP_INSTALL'
          : 'COUNTER_PICKUP';

    const partLineTotal = requestProduct.price;
    const installFee =
      requestDeliveryOption === 'INSTALL_IN_WORKSHOP' ? requestProduct.installEstimate || 0 : 0;
    const subtotal = partLineTotal + installFee;
    const taxAmount = Math.round(subtotal * 0.1 * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
    const seq = String(14 + (invoices?.length || 0)).padStart(3, '0');

    createInvoice({
      invoiceNumber: `POS-2026-${seq}`,
      kind: 'PARTS_SALE',
      customerId: demoCustomerId(currentUser),
      customerName: currentUser?.name || 'John Doe',
      customerEmail: currentUser?.email || 'john.doe@example.com',
      customerPhone: currentUser?.phone || '+855 12 345 678',
      customerAddress: 'Phnom Penh',
      vehicleInfo: selectedCarForRequest,
      vehiclePlate: defaultCar.licensePlate,
      fulfillment,
      items: [
        {
          id: 'line-part',
          description: requestProduct.name,
          type: 'PART',
          sku: requestProduct.sku,
          quantity: 1,
          unitPrice: requestProduct.price,
          totalPrice: requestProduct.price
        },
        ...(installFee
          ? [
              {
                id: 'line-fit',
                description: 'Parts-counter fitting fee',
                type: 'LABOR' as const,
                quantity: 1,
                unitPrice: installFee,
                totalPrice: installFee
              }
            ]
          : [])
      ],
      subtotal,
      taxRatePercent: 10,
      taxAmount,
      discountPercent: 0,
      discountAmount: 0,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'PENDING',
      notes: requestNotes
        ? `Counter sale. ${requestNotes}`
        : 'Parts-counter equipment sale. This is not a workshop service invoice.'
    });

    setSubmittedRequests((prev) => [newReq, ...prev]);
    setRequestProduct(null);
    setRequestNotes('');

    addToast({
      type: 'success',
      title: 'Parts invoice opened',
      message: `${requestProduct.name} billed as a parts-sale ticket (not a repair invoice). Check Invoices.`
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
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
              {ALL_COMPANY_PRODUCTS.length} Total SKUs
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Parts & Products Catalog
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mt-1">
            Equipment for sales: {ALL_COMPANY_PRODUCTS.length} SKUs with OEM numbers, barcodes, specs,
            origin, and fitment. Same catalog photos — open Specs & Fit for the full item data.
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

      {/* 2. CAR BRAND FITMENT & RECOMMENDATION SELECTOR */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Filter by Car Brand Fitment & Recommendations
                </h2>
                {selectedBrand !== 'ALL' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active: {selectedBrand}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Choose your vehicle brand to automatically identify compatible parts and certified recommendations.
              </p>
            </div>
          </div>

          {/* Quick Shortcuts for Customer's Saved Vehicles */}
          {myVehicles.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-medium">My Vehicles:</span>
              {myVehicles.map((veh) => {
                const isSelected = selectedBrand.toLowerCase() === veh.brand.toLowerCase();
                return (
                  <button
                    key={veh.id}
                    onClick={() => handleSelectCustomerCar(veh.brand)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-500'
                        : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span>🚗 {veh.brand}</span>
                    <span className="text-[10px] opacity-75">({veh.model})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Car Brand Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none">
          {CAR_BRANDS.map((brand) => {
            const isSelected = selectedBrand === brand;
            return (
              <button
                key={brand}
                onClick={() => handleSelectBrand(brand)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/50'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
                }`}
              >
                {brand === 'ALL' ? (
                  <span>Display All Brands</span>
                ) : brand === 'Universal' ? (
                  <span>🌐 Universal Fit</span>
                ) : (
                  <>
                    <Car className="w-3.5 h-3.5 opacity-70" />
                    <span>{brand}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Car Brand Fitment Banner (When a specific brand is selected) */}
        {selectedBrand !== 'ALL' && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-950 to-slate-950 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Filtered for {selectedBrand} Vehicles</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {recommendedCountForBrand} Recommended Parts
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing products verified for {selectedBrand} engineering standards and universal garage consumables.
                </p>
              </div>
            </div>

            {/* Filter Mode: All compatible vs Recommended Only */}
            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'ALL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All {selectedBrand} Compatible ({filteredProducts.length})
              </button>
              <button
                onClick={() => setFilterMode('RECOMMENDED_ONLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterMode === 'RECOMMENDED_ONLY'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Recommended Only ({recommendedCountForBrand})</span>
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

          {/* Reset Filters button if any active filter */}
          {(selectedBrand !== 'ALL' || selectedCategory !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedBrand('ALL');
                setSelectedCategory('ALL');
                setSearchQuery('');
                setFilterMode('ALL');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All Categories' },
            { id: 'Brakes & Rotors', label: 'Brakes & Rotors' },
            { id: 'Fluids & Oils', label: 'Fluids & Oils' },
            { id: 'Filters', label: 'Filters' },
            { id: 'Engine & Ignition', label: 'Engine & Ignition' },
            { id: 'Batteries & Electrical', label: 'Batteries & Electrical' },
            { id: 'Tires & Wheels', label: 'Tires & Wheels' },
            { id: 'Belts & Cooling', label: 'Belts & Cooling' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. PRODUCTS CATALOG GRID */}
      {filteredProducts.length === 0 ? (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-12 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Products Found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            No parts in our inventory matched your search and car brand filter. Try clearing the
            brand selection or switching categories to see all products.
          </p>
          <button
            onClick={() => {
              setSelectedBrand('ALL');
              setSelectedCategory('ALL');
              setSearchQuery('');
              setFilterMode('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors cursor-pointer"
          >
            Show All Company Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            // Check if this product is recommended for the selected car brand (or universally)
            const isRecommendedForActiveBrand =
              selectedBrand !== 'ALL'
                ? product.recommendedForBrands.includes(selectedBrand) ||
                  product.recommendedForBrands.includes('Universal')
                : product.recommendedForBrands.length > 0;

            const fitsActiveBrand =
              selectedBrand === 'ALL' ||
              product.compatibleBrands.includes('Universal') ||
              product.compatibleBrands.includes(selectedBrand);

            return (
              <div
                key={product.id}
                className={`bg-slate-900 rounded-3xl border flex flex-col justify-between overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1 group ${
                  isRecommendedForActiveBrand && selectedBrand !== 'ALL'
                    ? 'border-amber-500/50 shadow-amber-500/5 ring-1 ring-amber-500/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
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

                  {/* Car Brand Recommendation Ribbon */}
                  {isRecommendedForActiveBrand && (
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-lg">
                        <Sparkles className="w-3.5 h-3.5 fill-current shrink-0" />
                        <span className="truncate">
                          {selectedBrand !== 'ALL'
                            ? `Recommended for ${selectedBrand}`
                            : `Recommended for ${product.recommendedForBrands.slice(0, 3).join(', ')}`}
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
                      <span className="truncate">{product.unitOfMeasure}</span>
                      <span className="truncate">{product.netWeight}</span>
                    </div>

                    {/* Car Brand Compatibility Badges */}
                    <div className="pt-1 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Car className="w-3 h-3 text-blue-400" />
                        <span>Compatible Car Brands:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {product.compatibleBrands.map((brand) => (
                          <span
                            key={brand}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              selectedBrand === brand
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-950 text-slate-300 border border-slate-800'
                            }`}
                          >
                            {brand}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400 italic truncate">
                        {product.compatibleModelsDescription}
                      </p>
                    </div>

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
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Specs & Fit</span>
                      </button>

                      <button
                        onClick={() => setRequestProduct(product)}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
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
              {/* Select Car for fitment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-blue-400" />
                  <span>Target Vehicle for this Part:</span>
                </label>
                <select
                  value={selectedCarForRequest}
                  onChange={(e) => setSelectedCarForRequest(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {myVehicles.map((v) => (
                    <option key={v.id} value={`${v.brand} ${v.model} (${v.licensePlate})`}>
                      {v.brand} {v.model} (Plate: {v.licensePlate})
                    </option>
                  ))}
                  <option value="Other Vehicle">Other / Unregistered Vehicle</option>
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
                      onClick={() => setRequestDeliveryOption(opt.id as any)}
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
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400">Estimated Total Cost</div>
                  <div className="text-lg font-black text-white">
                    $
                    {(
                      requestProduct.price +
                      (requestDeliveryOption === 'INSTALL_IN_WORKSHOP'
                        ? requestProduct.installEstimate || 0
                        : 0)
                    ).toFixed(2)}
                  </div>
                </div>
                <div className="text-xs text-slate-400 text-right">
                  {requestDeliveryOption === 'INSTALL_IN_WORKSHOP'
                    ? `Includes estimated +$${requestProduct.installEstimate} installation`
                    : 'Part Only Price'}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRequestProduct(null)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit Request</span>
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
                    {activeDetailProduct.condition} · {activeDetailProduct.stockCount} units on shelf
                    {activeDetailProduct.position ? ` · ${activeDetailProduct.position}` : ''}
                  </div>
                </div>

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

                <button
                  onClick={() => {
                    setRequestProduct(activeDetailProduct);
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
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full p-6 space-y-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">My Requested Parts</h3>
                </div>
                <button
                  onClick={() => setShowRequestsDrawer(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submittedRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Package className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="text-xs">You haven't requested any parts yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submittedRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-slate-400">{req.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{req.productName}</h4>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Vehicle: {req.carBrand} ({req.vehiclePlate})</span>
                        <strong className="text-white">${req.price.toFixed(2)}</strong>
                      </div>
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
