# @bffless/use-bff-state

React hook for managing server-side state with [BFFless](https://bffless.app) Data Tables and Pipelines.

## Installation

```bash
npm install @bffless/use-bff-state
# or
pnpm add @bffless/use-bff-state
# or
yarn add @bffless/use-bff-state
```

## Quick Start

### 1. Wrap your app with `BffStateProvider`

```tsx
import { BffStateProvider } from '@bffless/use-bff-state';

function App() {
  return (
    <BffStateProvider>
      <YourApp />
    </BffStateProvider>
  );
}
```

### 2. Use `useBffState` in your components

```tsx
import { useBffState } from '@bffless/use-bff-state';

function Cart() {
  const { data, loading, error, update } = useBffState('/api/cart', {
    items: [],
  });

  const addItem = async (item: CartItem) => {
    await update((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Cart ({data.items.length} items)</h2>
      {data.items.map((item) => (
        <CartItem key={item.id} item={item} />
      ))}
      <button onClick={() => addItem({ id: 'new', name: 'New Item' })}>
        Add Item
      </button>
    </div>
  );
}
```

## API Reference

### `BffStateProvider`

Provider component that wraps your app and provides configuration.

```tsx
<BffStateProvider
  options={{
    headers: { 'X-Custom': 'value' }, // Additional headers for all requests
    persistence: { days: 30 }, // Cookie persistence (see options below)
    baseUrl: '/api', // Base URL prefix for all requests
    staleTime: 5000, // Time in ms before refetching on window focus
  }}
>
  <App />
</BffStateProvider>
```

#### Provider Options

| Option        | Type                                         | Default     | Description                                  |
| ------------- | -------------------------------------------- | ----------- | -------------------------------------------- |
| `headers`     | `Record<string, string>`                     | `{}`        | Headers included in all requests             |
| `persistence` | `'session' \| { days: number } \| 'forever'` | `'forever'` | Guest ID cookie persistence                  |
| `baseUrl`     | `string`                                     | `''`        | Base URL prefix for API requests             |
| `staleTime`   | `number`                                     | `5000`      | Milliseconds before data is considered stale |

### `useBffState<T>(path, initialValue, options?)`

Hook for fetching and updating server-side state.

```tsx
const {
  data, // Current state (T)
  loading, // True during any operation
  error, // Error from last operation
  update, // Update state on server
  refetch, // Manually refetch state
  isUninitialized, // True before first fetch
  isFetching, // True during GET request
  isUpdating, // True during POST request
} = useBffState(
  '/api/cart',
  { items: [] },
  {
    skip: false, // Skip initial fetch
    headers: { 'X-Hook': 'value' }, // Per-hook headers
    refetchOnWindowFocus: true, // Refetch when tab becomes visible
  }
);
```

#### Parameters

| Parameter      | Type                 | Description                           |
| -------------- | -------------------- | ------------------------------------- |
| `path`         | `string`             | API endpoint path (e.g., `/api/cart`) |
| `initialValue` | `T`                  | Initial value before data is fetched  |
| `options`      | `UseBffStateOptions` | Optional configuration for this hook  |

#### Hook Options

| Option                 | Type                     | Default | Description                               |
| ---------------------- | ------------------------ | ------- | ----------------------------------------- |
| `skip`                 | `boolean`                | `false` | Skip the initial fetch                    |
| `headers`              | `Record<string, string>` | `{}`    | Additional headers (merged with provider) |
| `refetchOnWindowFocus` | `boolean`                | `true`  | Refetch when tab becomes visible          |

#### Return Value

| Property          | Type                                               | Description                       |
| ----------------- | -------------------------------------------------- | --------------------------------- |
| `data`            | `T`                                                | Current state value               |
| `loading`         | `boolean`                                          | True during fetch or update       |
| `error`           | `Error \| null`                                    | Error from last operation         |
| `update`          | `(newState: T \| (prev: T) => T) => Promise<void>` | Update state on server            |
| `refetch`         | `() => Promise<void>`                              | Manually refetch state            |
| `isUninitialized` | `boolean`                                          | True before first fetch completes |
| `isFetching`      | `boolean`                                          | True during GET request           |
| `isUpdating`      | `boolean`                                          | True during POST request          |

## Patterns

### Global State (Feature Flags)

```tsx
function useFeatureFlags() {
  return useBffState('/api/feature-flags', {
    darkMode: false,
    betaFeatures: false,
  });
}

function Settings() {
  const { data: flags, update } = useFeatureFlags();

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={flags.darkMode}
          onChange={(e) =>
            update((prev) => ({ ...prev, darkMode: e.target.checked }))
          }
        />
        Dark Mode
      </label>
    </div>
  );
}
```

### User-Scoped State (Cart, Preferences)

The hook automatically includes a guest ID in requests, allowing the backend to identify anonymous users:

```tsx
// Guest ID is automatically included as ?_bffGuestId=<uuid>
const { data: cart, update } = useBffState('/api/cart', { items: [] });
```

### Conditional Fetching

```tsx
function UserProfile({ userId }: { userId: string | null }) {
  const { data, loading } = useBffState(
    `/api/users/${userId}/preferences`,
    { theme: 'light' },
    { skip: !userId } // Don't fetch until userId is available
  );

  if (!userId) return <div>Please log in</div>;
  if (loading) return <div>Loading...</div>;

  return <div>Theme: {data.theme}</div>;
}
```

### Optimistic Updates

```tsx
function Counter() {
  const { data, update } = useBffState('/api/counter', { count: 0 });

  const increment = async () => {
    // The update function uses the current data to compute new state
    await update((prev) => ({ count: prev.count + 1 }));
  };

  return (
    <div>
      <span>{data.count}</span>
      <button onClick={increment}>+</button>
    </div>
  );
}
```

## Backend Setup

This hook is designed to work with BFFless Data Tables and Pipelines. See the [BFFless documentation](https://docs.bffless.app/recipes/state-management/) for setting up your backend.

### Expected API Behavior

**GET `/api/state/:key`**

- Returns the current state as JSON
- Uses `?_bffGuestId=<uuid>` query parameter for user identification

**POST `/api/state/:key`**

- Accepts new state as JSON body
- Returns the updated state as JSON
- Uses `?_bffGuestId=<uuid>` query parameter for user identification

## TypeScript

The hook is fully typed and infers the type from your initial value:

```tsx
interface CartState {
  items: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
  total: number;
}

const { data, update } = useBffState<CartState>('/api/cart', {
  items: [],
  total: 0,
});

// TypeScript knows:
// - data.items is Array<{ id: string; name: string; quantity: number }>
// - data.total is number
// - update expects CartState or (prev: CartState) => CartState
```

## Cookie Details

The library uses a `bff-guest-id` cookie to identify anonymous users across sessions:

- **Name**: `bff-guest-id`
- **Value**: UUID v4
- **Path**: `/`
- **SameSite**: `Lax`

### Persistence Options

| Option        | Cookie Behavior                         |
| ------------- | --------------------------------------- |
| `'session'`   | Expires when browser closes             |
| `{ days: N }` | Persists for N days                     |
| `'forever'`   | Persists for 400 days (browser maximum) |

## License

MIT
