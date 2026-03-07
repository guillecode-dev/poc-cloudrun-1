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
