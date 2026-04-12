import React, { useState, useEffect } from 'react';
import { Settings, Users, Trash2, Edit2, LogOut, Shield, Smartphone, Globe, Clock, Activity } from 'lucide-react';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsLoggedIn(true);
      fetchUsers(token);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server tidak mengembalikan JSON. Status: ${res.status}. Response: ${text.substring(0, 50)}...`);
      }

      if (data.success) {
        localStorage.setItem('admin_token', data.token);
        setIsLoggedIn(true);
        fetchUsers(data.token);
      } else {
        setLoginError(data.error || 'Login gagal');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setLoginError(`Terjadi kesalahan: ${err.message || String(err)}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  const fetchUsers = async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        setUsers(data.sort((a: any, b: any) => b.lastSeen - a.lastSeen));
      } else if (res.status === 401) {
        handleLogout();
      } else {
        console.error("Failed to fetch users. Status:", res.status);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMessage('');
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername, password: newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMessage('Berhasil mengubah kredensial. Silakan login kembali.');
        setTimeout(() => {
          handleLogout();
        }, 2000);
      } else {
        setSettingsMessage(data.error || 'Gagal mengubah pengaturan');
      }
    } catch (err) {
      setSettingsMessage('Terjadi kesalahan server');
    }
  };

  const handleSetLimit = async (ip: string) => {
    const limitStr = prompt('Masukkan limit request baru (0 untuk tanpa batas):', '100');
    if (limitStr === null) return;
    const limit = parseInt(limitStr);
    if (isNaN(limit)) return alert('Limit harus berupa angka');

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch('/api/admin/users/limit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ip, limit })
      });
      if (res.ok) {
        fetchUsers(token);
      }
    } catch (err) {
      console.error('Error setting limit:', err);
    }
  };

  const handleDeleteUser = async (ip: string) => {
    if (!confirm(`Yakin ingin menghapus/memblokir user dengan IP ${ip}?`)) return;

    const token = localStorage.getItem('admin_token');
    if (!token) return;

    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ip })
      });
      if (res.ok) {
        fetchUsers(token);
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const getDeviceType = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'Mobile';
    if (ua.includes('tablet') || ua.includes('ipad')) return 'Tablet';
    return 'Desktop';
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-3 rounded-2xl">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">Admin Login</h1>
          
          {loginError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 text-center border border-red-100">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Masukkan username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Masukkan password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors mt-2 shadow-md shadow-blue-500/20"
            >
              Masuk
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-2xl">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Kelola pengguna dan pengaturan sistem</p>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={() => fetchUsers(localStorage.getItem('admin_token')!)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              <Activity className="w-4 h-4" />
              Refresh
            </button>
            <button 
              onClick={handleLogout}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Box 1: Settings */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gray-100 p-2 rounded-xl">
                  <Settings className="w-5 h-5 text-gray-700" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Pengaturan Admin</h2>
              </div>
              
              {settingsMessage && (
                <div className={`p-3 rounded-xl text-sm mb-6 text-center border ${settingsMessage.includes('Berhasil') ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  {settingsMessage}
                </div>
              )}

              <form onSubmit={handleUpdateSettings} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username Baru</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="Username baru"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="Password baru"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-900 hover:bg-black text-white font-medium py-2.5 rounded-xl transition-colors mt-2"
                >
                  Simpan Perubahan
                </button>
              </form>
            </div>
            
            {/* Stats Summary */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-sm text-white">
              <h3 className="text-blue-100 font-medium mb-4">Statistik Singkat</h3>
              <div className="flex items-end gap-4">
                <div className="text-5xl font-bold">{users.length}</div>
                <div className="text-blue-100 mb-1">User Aktif<br/>(24 Jam Terakhir)</div>
              </div>
            </div>
          </div>

          {/* Box 2: Online Users List */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-xl">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Daftar User Online</h2>
              </div>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">
                {users.length} User
              </span>
            </div>

            <div className="p-0 overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Memuat data...</div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Belum ada user online.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold">User Info</th>
                      <th className="p-4 font-semibold">Aktivitas</th>
                      <th className="p-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-gray-100 p-2 rounded-lg shrink-0 mt-1">
                              {getDeviceType(user.userAgent) === 'Mobile' ? (
                                <Smartphone className="w-4 h-4 text-gray-600" />
                              ) : (
                                <Globe className="w-4 h-4 text-gray-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-mono text-sm font-semibold text-gray-900">{user.ip}</div>
                              <div className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-[200px]" title={user.userAgent}>
                                {user.userAgent}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Activity className="w-3.5 h-3.5 text-blue-500" />
                              <span className="font-medium">{user.requestCount}</span> / {user.limit === 0 ? '∞' : user.limit} req
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Clock className="w-3.5 h-3.5" />
                              {formatTime(user.lastSeen)}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSetLimit(user.ip)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium transition-colors"
                              title="Atur Limit Request"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Limit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.ip)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors"
                              title="Hapus / Blokir User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
