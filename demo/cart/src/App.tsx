import { useBffState } from '@bffless/use-bff-state';
import type { CartState, CartItem, Product } from './types';

// Round to 2 decimal places to avoid floating point issues
const round = (n: number) => Math.round(n * 100) / 100;

// Sample products
const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Wireless Headphones',
    price: 79.99,
    image: 'https://picsum.photos/seed/headphones/200/200',
    description: 'Premium wireless headphones with noise cancellation',
  },
  {
    id: 'prod-2',
    name: 'Mechanical Keyboard',
    price: 129.99,
    image: 'https://picsum.photos/seed/keyboard/200/200',
    description: 'RGB mechanical keyboard with cherry switches',
  },
  {
    id: 'prod-3',
    name: 'USB-C Hub',
    price: 49.99,
    image: 'https://picsum.photos/seed/usbhub/200/200',
    description: '7-in-1 USB-C hub with HDMI and card reader',
  },
  {
    id: 'prod-4',
    name: 'Webcam HD',
    price: 89.99,
    image: 'https://picsum.photos/seed/webcam/200/200',
    description: '1080p webcam with built-in microphone',
  },
];

const initialCart: CartState = { items: [], total: 0 };

function App() {
  const {
    data: cart,
    loading,
    error,
    update,
    isUpdating,
    isFetching,
    isUninitialized,
    refetch,
  } = useBffState<CartState>('/api/state/cart_state', initialCart, {
    refetchOnWindowFocus: true,
  });

  const addToCart = async (product: Product) => {
    await update((prev) => {
      const existingItem = prev.items.find((item) => item.id === product.id);
      if (existingItem) {
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
          total: round(prev.total + product.price),
        };
      }
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image,
      };
      return {
        ...prev,
        items: [...prev.items, newItem],
        total: round(prev.total + product.price),
      };
    });
  };

  const removeFromCart = async (itemId: string) => {
    await update((prev) => {
      const item = prev.items.find((i) => i.id === itemId);
      if (!item) return prev;
      return {
        ...prev,
        items: prev.items.filter((i) => i.id !== itemId),
        total: round(prev.total - item.price * item.quantity),
      };
    });
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeFromCart(itemId);
      return;
    }
    await update((prev) => {
      const item = prev.items.find((i) => i.id === itemId);
      if (!item) return prev;
      const diff = newQuantity - item.quantity;
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId ? { ...i, quantity: newQuantity } : i
        ),
        total: round(prev.total + diff * item.price),
      };
    });
  };

  const clearCart = async () => {
    await update({ items: [], total: 0 });
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>use-bff-state Cart Demo</h1>
        <p style={styles.subtitle}>
          State management powered by{' '}
          <code style={styles.code}>@bffless/use-bff-state</code>
        </p>
      </header>

      <div style={styles.layout}>
        {/* Products Section */}
        <section style={styles.productsSection}>
          <h2 style={styles.sectionTitle}>Products</h2>
          <div style={styles.productGrid}>
            {products.map((product) => (
              <div key={product.id} style={styles.productCard}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={styles.productImage}
                />
                <h3 style={styles.productName}>{product.name}</h3>
                <p style={styles.productDesc}>{product.description}</p>
                <p style={styles.productPrice}>${product.price.toFixed(2)}</p>
                <button
                  onClick={() => addToCart(product)}
                  disabled={isUpdating}
                  style={{
                    ...styles.addButton,
                    opacity: isUpdating ? 0.6 : 1,
                  }}
                >
                  {isUpdating ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Cart Section */}
        <aside style={styles.cartSection}>
          <div style={styles.cartHeader}>
            <h2 style={styles.sectionTitle}>
              Shopping Cart ({cart.items.length})
            </h2>
            <button
              onClick={() => refetch()}
              disabled={loading}
              style={styles.refreshButton}
              title="Refresh cart"
            >
              {isFetching ? '...' : '↻'}
            </button>
          </div>

          {/* Status Indicators */}
          <div style={styles.statusBar}>
            {isUninitialized && (
              <span style={styles.statusBadge}>Loading...</span>
            )}
            {isFetching && !isUninitialized && (
              <span style={styles.statusBadge}>Syncing...</span>
            )}
            {isUpdating && (
              <span style={styles.statusBadgeUpdating}>Updating...</span>
            )}
            {error && (
              <span style={styles.statusBadgeError}>
                Error: {error.message}
              </span>
            )}
          </div>

          {cart.items.length === 0 ? (
            <p style={styles.emptyCart}>Your cart is empty</p>
          ) : (
            <>
              <div style={styles.cartItems}>
                {cart.items.map((item) => (
                  <div key={item.id} style={styles.cartItem}>
                    <img
                      src={item.image}
                      alt={item.name}
                      style={styles.cartItemImage}
                    />
                    <div style={styles.cartItemDetails}>
                      <h4 style={styles.cartItemName}>{item.name}</h4>
                      <p style={styles.cartItemPrice}>
                        ${item.price.toFixed(2)} each
                      </p>
                      <div style={styles.quantityControls}>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={isUpdating}
                          style={styles.quantityButton}
                        >
                          −
                        </button>
                        <span style={styles.quantity}>{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={isUpdating}
                          style={styles.quantityButton}
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          disabled={isUpdating}
                          style={styles.removeButton}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div style={styles.cartItemTotal}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.cartFooter}>
                <div style={styles.totalRow}>
                  <span>Total:</span>
                  <span style={styles.totalAmount}>
                    ${cart.total.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={clearCart}
                  disabled={isUpdating}
                  style={styles.clearButton}
                >
                  Clear Cart
                </button>
                <button disabled={isUpdating} style={styles.checkoutButton}>
                  Checkout
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      <footer style={styles.footer}>
        <p>
          This demo uses <code>useBffState</code> to manage cart state with
          automatic guest ID tracking, stale data refetching, and loading
          states.
        </p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '8px',
    color: '#1a1a1a',
  },
  subtitle: {
    color: '#666',
    fontSize: '1rem',
  },
  code: {
    background: '#e8e8e8',
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '30px',
  },
  productsSection: {
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: '1.25rem',
    marginBottom: '20px',
    color: '#1a1a1a',
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  productCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  productImage: {
    width: '100%',
    height: '150px',
    objectFit: 'cover',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  productName: {
    fontSize: '1rem',
    marginBottom: '4px',
    color: '#1a1a1a',
  },
  productDesc: {
    fontSize: '0.85rem',
    color: '#666',
    marginBottom: '8px',
  },
  productPrice: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: '12px',
  },
  addButton: {
    width: '100%',
    padding: '10px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  cartSection: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    height: 'fit-content',
    position: 'sticky',
    top: '20px',
  },
  cartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  refreshButton: {
    background: '#f0f0f0',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '1.2rem',
  },
  statusBar: {
    minHeight: '24px',
    marginBottom: '12px',
  },
  statusBadge: {
    background: '#e0e7ff',
    color: '#4338ca',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.8rem',
  },
  statusBadgeUpdating: {
    background: '#fef3c7',
    color: '#b45309',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.8rem',
  },
  statusBadgeError: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.8rem',
  },
  emptyCart: {
    textAlign: 'center',
    color: '#666',
    padding: '40px 0',
  },
  cartItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  cartItem: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    background: '#f9f9f9',
    borderRadius: '8px',
  },
  cartItemImage: {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '6px',
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    fontSize: '0.9rem',
    marginBottom: '4px',
  },
  cartItemPrice: {
    fontSize: '0.8rem',
    color: '#666',
    marginBottom: '8px',
  },
  quantityControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  quantityButton: {
    width: '28px',
    height: '28px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  quantity: {
    minWidth: '24px',
    textAlign: 'center',
    fontWeight: '500',
  },
  removeButton: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  cartItemTotal: {
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  cartFooter: {
    borderTop: '1px solid #eee',
    paddingTop: '16px',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '1.1rem',
    marginBottom: '16px',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#2563eb',
    fontSize: '1.25rem',
  },
  clearButton: {
    width: '100%',
    padding: '10px',
    background: '#fff',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '8px',
  },
  checkoutButton: {
    width: '100%',
    padding: '12px',
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
  },
  footer: {
    marginTop: '40px',
    textAlign: 'center',
    color: '#666',
    fontSize: '0.9rem',
    padding: '20px',
    borderTop: '1px solid #eee',
  },
};

export default App;
