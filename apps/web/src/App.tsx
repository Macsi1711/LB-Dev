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
    // Login obligatorio (ADR-013): sin sesión, al login y de vuelta a donde iba.
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <CounterScreen /> },
          { path: '/fotos', element: <PhotosScreen /> },
          {
            // Métricas y Productos: solo el admin.
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
