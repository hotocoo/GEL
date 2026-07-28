'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth';
import Navbar from '../../components/Navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !checked) {
      setChecked(true);
      router.push('/login');
    } else {
      setChecked(true);
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !checked) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">{children}</div>
    </div>
  );
}
