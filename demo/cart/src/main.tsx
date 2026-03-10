import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BffStateProvider } from '@bffless/use-bff-state';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BffStateProvider
      options={{
        persistence: { days: 30 },
        staleTime: 5000,
      }}
    >
      <App />
    </BffStateProvider>
  </StrictMode>
);
