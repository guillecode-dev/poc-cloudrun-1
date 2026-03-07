export interface Item {
  id: number;
  sku: string;
  name: string;
}

export interface Order {
  id: number;
  order_no: string;
  status: string;
  total: number;
  created_at: string;
}

export interface CreateOrderDto {
  sku: string;
  qty: number;
  price: number;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  createdAt: Date;
  expireAt: Date;
  lastAccessedAt: Date;
}
