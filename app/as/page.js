'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AS() {
  const router = useRouter();
  useEffect(() => { router.replace('/nouveau-patient'); }, []);
  return null;
}
