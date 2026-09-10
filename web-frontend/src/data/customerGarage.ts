import {
  Estimate,
  PaymentReceipt,
  ServiceHistoryRecord,
  WarrantyClaim
} from '../types';

export const initialEstimates: Estimate[] = [
  {
    id: 'est-2026-041',
    estimateNumber: 'EST-2026-041',
    customerId: 'cust-1',
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    vehicleId: 'veh-1',
    vehicleInfo: 'Toyota Camry Hybrid (2022)',
    vehiclePlate: 'PP-1234',
    workOrderId: 'wo-1024',
    workOrderNumber: 'WO-1024',
    recommendedServices: ['Front rotor replacement', 'Brake fluid flush'],
    items: [
      { id: 'el-1', description: 'Replace both front brake rotors (labor)', type: 'LABOR', quantity: 1.5, unitPrice: 35, totalPrice: 52.5 },
      { id: 'el-2', description: 'Toyota OEM front brake rotors (pair)', type: 'PART', quantity: 1, unitPrice: 180, totalPrice: 180 },
      { id: 'el-3', description: 'DOT 4 brake fluid flush & bleed', type: 'SERVICE', quantity: 1, unitPrice: 40, totalPrice: 40 }
    ],
    laborCost: 52.5,
    serviceCost: 40,
    partsCost: 180,
    subtotal: 272.5,
    discount: 0,
    taxRatePercent: 10,
    taxAmount: 27.25,
    estimatedTotal: 299.75,
    status: 'WAITING_APPROVAL',
    createdAt: '2026-09-09',
    validUntil: '2026-09-16',
    notes: 'Diagnosis found front rotors below minimum thickness. Repair on WO-1024 pauses until you approve this quotation.'
  },
  {
    id: 'est-2026-028',
    estimateNumber: 'EST-2026-028',
    customerId: 'cust-1',
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    vehicleId: 'veh-5',
    vehicleInfo: 'Mazda CX-5 2.5L AWD (2020)',
    vehiclePlate: 'PP-8822',
    workOrderId: 'wo-1018',
    workOrderNumber: 'WO-1018',
    recommendedServices: ['40,000 km synthetic oil service'],
    items: [
      { id: 'el-4', description: 'Castrol EDGE 5W-30 oil service labor', type: 'LABOR', quantity: 1, unitPrice: 35, totalPrice: 35 },
      { id: 'el-5', description: 'Castrol EDGE 5W-30 4L + OEM filter', type: 'PART', quantity: 1, unitPrice: 58, totalPrice: 58 }
    ],
    laborCost: 35,
    serviceCost: 0,
    partsCost: 58,
    subtotal: 93,
    discount: 5,
    taxRatePercent: 10,
    taxAmount: 8.8,
    estimatedTotal: 96.8,
    status: 'APPROVED',
    customerDecisionNote: 'Approved via customer portal.',
    decidedAt: '2026-07-11',
    createdAt: '2026-07-10',
    validUntil: '2026-07-17'
  }
];

export const initialServiceHistory: ServiceHistoryRecord[] = [
  {
    id: 'hist-camry-1024',
    vehicleId: 'veh-1',
    customerId: 'cust-1',
    workOrderId: 'wo-1024',
    workOrderNumber: 'WO-1024',
    serviceDate: '2026-09-05',
    mileage: 42500,
    serviceType: 'Ceramic brake pad replacement & rotor resurfacing',
    mechanicName: 'Dara Kim',
    partsUsed: 'Akebono ceramic pads, Brembo DOT 4 fluid',
    laborCost: 87.5,
    totalCost: 315.52,
    nextServiceDate: '2026-12-05',
    nextServiceMileage: 47500,
    status: 'IN_PROGRESS'
  },
  {
    id: 'hist-camry-oil',
    vehicleId: 'veh-1',
    customerId: 'cust-1',
    workOrderId: 'wo-0991',
    workOrderNumber: 'WO-0991',
    serviceDate: '2026-06-12',
    mileage: 40012,
    serviceType: 'Scheduled 40,000 km synthetic oil & multi-point inspection',
    mechanicName: 'Sokha Heng',
    partsUsed: 'Castrol EDGE 5W-30 4L, Toyota oil filter',
    laborCost: 35,
    totalCost: 85,
    nextServiceDate: '2026-09-12',
    nextServiceMileage: 45012,
    status: 'COMPLETED'
  },
  {
    id: 'hist-camry-ac',
    vehicleId: 'veh-1',
    customerId: 'cust-1',
    workOrderId: 'wo-0944',
    workOrderNumber: 'WO-0944',
    serviceDate: '2026-01-20',
    mileage: 35210,
    serviceType: 'Air conditioning evaporator clean & cabin filter',
    mechanicName: 'Dara Kim',
    partsUsed: 'Toyota cabin microfilter',
    laborCost: 40,
    totalCost: 65,
    nextServiceDate: '2027-01-20',
    nextServiceMileage: 55210,
    status: 'COMPLETED'
  },
  {
    id: 'hist-mazda-oil',
    vehicleId: 'veh-5',
    customerId: 'cust-1',
    workOrderId: 'wo-1018',
    workOrderNumber: 'WO-1018',
    serviceDate: '2026-07-12',
    mileage: 64100,
    serviceType: 'Full synthetic oil change & battery health check',
    mechanicName: 'Sokha Heng',
    partsUsed: 'Castrol EDGE 5W-30, Bosch AGM battery',
    laborCost: 35,
    totalCost: 248,
    nextServiceDate: '2026-10-12',
    nextServiceMileage: 69100,
    status: 'COMPLETED'
  }
];

export const initialPaymentReceipts: PaymentReceipt[] = [
  {
    id: 'rcp-pos-014',
    receiptNumber: 'RCP-2026-014',
    paymentId: 'pay-pos-014',
    invoiceId: 'pos-2026-014',
    invoiceNumber: 'POS-2026-014',
    customerId: 'cust-1',
    customerName: 'John Doe',
    vehicleInfo: 'Toyota Camry Hybrid (PP-1234)',
    amount: 139.15,
    paymentMethod: 'ABA PayWay',
    paymentDate: '2026-08-22'
  },
  {
    id: 'rcp-089-p1',
    receiptNumber: 'RCP-2026-089-01',
    paymentId: 'pay-089-p1',
    invoiceId: 'inv-2026-089',
    invoiceNumber: 'INV-2026-089',
    customerId: 'cust-1',
    customerName: 'John Doe',
    vehicleInfo: 'Toyota Camry Hybrid (PP-1234)',
    amount: 100,
    paymentMethod: 'ABA PayWay',
    paymentDate: '2026-09-08'
  }
];

export const initialWarrantyClaims: WarrantyClaim[] = [];
