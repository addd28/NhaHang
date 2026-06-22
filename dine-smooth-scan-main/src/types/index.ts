export type UserRole = "ADMIN" | "KITCHEN" | "WAITER" | "CASHIER" | "USER" | "BRANCH_MANAGER";

export interface User {
  id?: number;
  username: string;
  role: UserRole;
  branchId?: number;
  branchName?: string;
}

export type TableStatus = "EMPTY" | "RESERVED" | "OCCUPIED" | "DIRTY";

export interface RestaurantTable {
  id: number;
  tableNumber: number;
  capacity: number;
  qrToken: string;
  tableKey?: string;
  status: TableStatus;
  customerName?: string;
  phone?: string;
  guestCount?: number;
  reservationTime?: string;
  note?: string;
  confirmationCode?: string;
  reservationCode?: string;
  branchId?: number;
  branchName?: string;
}

export type SessionStatus = "OPEN" | "PAID" | "CLOSED";

export interface TableSession {
  id: number;
  table: RestaurantTable;
  status: SessionStatus;
  startTime: string;
  endTime?: string;
  sessionToken: string;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  subtotal?: number;
  serviceCharge?: number;
  taxAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export type MenuItemType = "INSTANT" | "KITCHEN";

export interface MenuItem {
  id: string | number;
  name: string;
  category: string; // lowcase name e.g., 'pizza'
  description: string;
  price: number;
  available: boolean;
  image?: string;
  imageUrl?: string;
  type?: MenuItemType;
  ingredients?: string[];
  calories?: number;
  allergens?: string[];
  tag?: "Chef's Pick" | "New" | "Popular";
  rating?: number;
  optionGroups?: OptionGroup[];
}

export type OptionGroupType = "SIZE" | "TOPPING" | "ADDON" | "COOKING_LEVEL" | "CUSTOM";
export type SelectionType = "SINGLE" | "MULTIPLE";

export interface ItemOption {
  id: number;
  optionCode: string;
  name: string;
  price: number;
  displayOrder: number;
  available: boolean;
  deleted?: boolean;
}

export interface OptionGroup {
  id: number;
  name: string;
  type: OptionGroupType;
  selectionType: SelectionType;
  required: boolean;
  minSelect?: number;
  maxSelect?: number;
  displayOrder: number;
  available: boolean;
  deleted?: boolean;
  options: ItemOption[];
}

export type OrderItemStatus = "PRE_ORDER" | "PENDING" | "PREPARING" | "DONE" | "DELIVERING" | "SERVED" | "CANCELLED" | "WASTED";

export interface OrderItem {
  itemId: number;
  orderId: number;
  menuItemId: number;
  menuItemName: string;
  quantity: number;
  note?: string;
  status: OrderItemStatus;
  type: MenuItemType;
  price?: number;
  orderedTime?: string;
  preparingTime?: string;
  doneTime?: string;
  deliveringTime?: string;
  servedTime?: string;
  totalPreparationDuration?: string;
  options?: string[];
}

export type PaymentMethod = "CASH" | "PAYPAL" | "VNPAY" | "MOMO";

export interface Payment {
  id: number;
  sessionId: number;
  paymentMethod: PaymentMethod;
  amount: number;
  paymentTime: string;
  status: string;
}

export interface ReservationResponse {
  id: number;
  customerName: string;
  phone: string;
  confirmationCode: string;
  reservationCode?: string;
  guestCount: number;
  reservationTime: string;
  note?: string;
  status: string;
  createdAt: string;
  tableNumber?: number;
  confirmedAt?: string;
  holdUntil?: string;
  checkedInAt?: string;
}

export interface Review {
  id?: number;
  sessionId: number;
  rating: number;
  comment?: string;
  createdAt?: string;
}

export interface Province {
  id: number;
  name: string;
  branchCount?: number;
  createdAt?: string;
}

export interface Branch {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  provinceId?: number;
  provinceName?: string;
  createdAt?: string;
}

export interface Article {
  id?: number;
  title: string;
  summary?: string;
  content: string;
  coverImage?: string;
  author?: string;
  status: "DRAFT" | "PUBLISHED";
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  uid: string;
  item: MenuItem;
  quantity: number;
  size: "Small" | "Medium" | "Large";
  toppings: string[];
  optionIds?: number[];
  cook?: "Rare" | "Medium" | "Well Done";
  notes: string;
  unitPrice: number;
}

export interface AdminLookupResponse {
  reservationId: number;
  customerName: string;
  reservationCode: string;
  reservationTime: string;
  guestCount: number;
  tableNumber: string | null;
  status: string;
}

export interface AdminCheckInResponse {
  success: boolean;
  reservationId: number;
  tableId: number;
  tableNumber: string;
  guestCount: number;
  message: string;
}

export interface WaitlistResponse {
  reservationId: number;
  customerName: string;
  phoneNumber: string;
  guestCount: number;
  reservationTime: string;
  waitingMinutes: number;
}


