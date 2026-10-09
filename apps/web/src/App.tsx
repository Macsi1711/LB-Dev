import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import {
  AuthModule,
  ForgotPasswordPage,
  LoginPage,
  NewPasswordPage,
  RequireAuth,
} from '@/features/auth';
import { AppShell, RequireRole } from '@/features/shell';
import { Toaster } from '@/shared/ui/sonner';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// Provisorio hasta las PRs de cada pantalla.
function Pendiente({ titulo }: { titulo: string }) {
  return <h1 className="p-4 text-lg font-semibold">{titulo}</h1>;
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/recuperar', element: <ForgotPasswordPage /> },
  { path: '/nueva-clave', element: <NewPasswordPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Pendiente titulo="Mostrador" /> },
          {
            element: <RequireRole />,
            children: [
              { path: '/fotos', element: <Pendiente titulo="Fotos" /> },
              { path: '/bot', element: <Pendiente titulo="Bot" /> },
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
