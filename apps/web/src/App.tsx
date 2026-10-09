import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router';
import {
  AuthModule,
  ForgotPasswordPage,
  LoginPage,
  NewPasswordPage,
  RequireAuth,
  useAuth,
} from '@/features/auth';
import { Toaster } from '@/shared/ui/sonner';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// Provisorio hasta la PR del layout y la navegación.
function Home() {
  const { profile, port } = useAuth();
  return (
    <main className="p-4">
      <p>
        Hola {profile?.name}. Rol: {profile?.role}.
      </p>
      <button className="underline" onClick={() => void port.signOut()}>
        Salir
      </button>
    </main>
  );
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/recuperar', element: <ForgotPasswordPage /> },
  { path: '/nueva-clave', element: <NewPasswordPage /> },
  { element: <RequireAuth />, children: [{ path: '/', element: <Home /> }] },
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
