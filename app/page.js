'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (s) router.push('/medecin');
    else router.push('/login');
  }, []);
  return null;
}
