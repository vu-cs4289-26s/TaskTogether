'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState('checking...');
  const [dbStatus, setDbStatus] = useState('checking...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthRes = await axios.get('http://localhost:3001/api/health');
        setBackendStatus('✓ Connected');
      } catch {
        setBackendStatus('✗ Backend not responding');
      }

      try {
        const dbRes = await axios.get('http://localhost:3001/api/db-check');
        setDbStatus('✓ Connected');
      } catch {
        setDbStatus('✗ Database not responding');
      }
    };

    checkHealth();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="max-w-md w-full bg-slate-700 rounded-lg p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Task Together</h1>
        <p className="text-slate-300 mb-8">Manage shared living without the drama</p>

        <div className="space-y-4">
          <div className="bg-slate-600 rounded p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">Backend Status</h2>
            <p className="text-lg text-white font-mono">{backendStatus}</p>
          </div>

          <div className="bg-slate-600 rounded p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-2">Database Status</h2>
            <p className="text-lg text-white font-mono">{dbStatus}</p>
          </div>
        </div>

      </div>
    </main>
  );
}
