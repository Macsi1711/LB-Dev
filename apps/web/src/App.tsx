import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, createHashRouter, Navigate, RouterProvider } from 'react-router';
import {
  AuthModule,
  ForgotPasswordPage,
  LoginPage,
  NewPasswordPage,
  RequireAuth,
} from '@/features/auth';
import { BotScreen } from '@/features/bot';
import { CounterScreen } from '@/features/counter';
import { PhotosScreen } from '@/features/photos';
import { ProductsScreen } from '@/features/products';
import { AppShell, RequireRole } from '@/features/shell';
import { isDemo } from '@/shared/lib/demo';
import { Toaster } from '@/shared/ui/sonner';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// En el demo las rutas van con # para funcionar en cualquier hosting estático.
const createRouter = isDemo ? createHashRouter : createBrowserRouter;

const router = createRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/recuperar', element: <ForgotPasswordPage /> },
  { path: '/nueva-clave', element: <NewPasswordPage /> },
  {
    element: <AppShell />,
    children: [
      // Sin sesión, el vendedor busca y ve cuántas fotos hay (ADR-011).
      { path: '/', element: <CounterScreen /> },
      { path: '/fotos', element: <PhotosScreen /> },
      {
        // Métricas y Productos: sin sesión, al login (y de vuelta a la sección); después, solo admin.
        element: <RequireAuth />,
        children: [
          {
            element: <RequireRole />,
            children: [
              { path: '/metricas', element: <BotScreen /> },
              { path: '/productos', element: <ProductsScreen /> },
              // Los links viejos a la sección Bot siguen andando.
              { path: '/bot', element: <Navigate to="/metricas" replace /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthModule>
        <RouterProvider router={router} />
        <Toaster position="top-center" />
      </AuthModule>
    </QueryClientProvider>
  );
}
