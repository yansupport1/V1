import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { joinByInviteCode } from '../services/groupService';
import { Button } from '../components/common/Button';

export function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && code) {
      doJoin();
    }
  }, [user, code]);

  const doJoin = async () => {
    if (!user || !code) return;
    setLoading(true);
    try {
      const convId = await joinByInviteCode(code, user.uid);
      navigate(`/chat/${convId}`, { replace: true });
    } catch (e: any) {
      setError(e.message || 'Gagal join');
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="font-semibold mb-2">Login dulu untuk join grup</p>
        <p className="text-sm text-muted mb-4">Kode undangan: {code}</p>
        <Button onClick={() => navigate('/')}>Ke beranda / login</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      {loading && <p className="text-muted">Menggabungkan ke grup...</p>}
      {error && (
        <>
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => navigate('/')}>Kembali</Button>
        </>
      )}
    </div>
  );
}
