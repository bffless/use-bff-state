export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface CartState {
  items: CartItem[];
  total: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}
