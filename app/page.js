'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const session = sessionStorage.getItem('pds_user');
    if (session) {
      const user = JSON.parse(session);
      if (user.role === 'as') router.push('/as');
      else if (user.role === 'ide') router.push('/ide');
      else if (user.role === 'medecin') router.push('/medecin');
    } else {
      router.push('/login');
    }
  }, []);
  return null;
}
