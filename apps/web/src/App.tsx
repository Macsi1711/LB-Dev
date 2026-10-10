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
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <CounterScreen /> },
          {
            element: <RequireRole />,
            children: [
              { path: '/fotos', element: <PhotosScreen /> },
              { path: '/bot', element: <BotScreen /> },
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
