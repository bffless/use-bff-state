# Cart Demo

A simple shopping cart demo showcasing `@bffless/use-bff-state`.

## Features

- Add products to cart
- Update item quantities
- Remove items from cart
- Clear cart
- Automatic guest ID tracking
- Loading and updating state indicators
- Refresh/sync cart state

## Running the Demo

From the repo root:

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build

# Run the demo
cd demo/cart
pnpm dev
```

Then open http://localhost:3001 in your browser.

## How It Works

This demo uses a mock API that intercepts fetch requests to `/api/cart`. The mock stores cart state in memory per guest ID, simulating how a real BFFless backend would work.

Key concepts demonstrated:

1. **BffStateProvider** - Wraps the app with configuration
2. **useBffState** - Main hook for managing cart state
3. **update()** - Functional updates for adding/removing items
4. **Loading states** - `isFetching`, `isUpdating`, `isUninitialized`
5. **refetch()** - Manual refresh of cart state
