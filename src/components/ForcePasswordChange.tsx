import { useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { supabase, signOut } from '../lib/supabase';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import { Button, Input } from './ui';

/**
 * Màn hình chặn toàn app khi tài khoản được cấp mật khẩu tạm
 * (users.must_change_password = true). Người dùng phải tự đặt mật khẩu mới
 * trước khi vào hệ thống.
 */
export function ForcePasswordChange() {
  const { user, setUser, logout } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Mật khẩu quá ngắn', 'Mật khẩu mới cần tối thiểu 8 ký tự.');
      return;
    }
    if (password !== confirm) {
      toast.error('Không khớp', 'Hai ô mật khẩu chưa giống nhau.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw new Error(authError.message);

      const { error: flagError } = await api.update('users', user!.id, {
        must_change_password: false,
      });
      if (flagError) throw new Error(flagError);

      setUser({ ...user!, must_change_password: false });
      toast.success('Đã đổi mật khẩu', 'Chào mừng bạn đến với hệ thống!');
    } catch (err) {
      toast.error(
        'Không đổi được mật khẩu',
        err instanceof Error ? err.message : 'Lỗi hệ thống'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    logout();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-3xl shadow-lg p-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
          <KeyRound className="w-7 h-7" />
        </div>
        <h1 className="text-[22px] font-bold text-on-surface mb-1">
          Đặt mật khẩu mới
        </h1>
        <p className="text-[14px] text-on-surface-variant mb-6">
          Tài khoản của bạn đang dùng mật khẩu tạm do nhà trường cấp. Vui lòng
          đặt mật khẩu riêng (tối thiểu 8 ký tự) để tiếp tục.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            label="Mật khẩu mới"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 8 ký tự"
            autoComplete="new-password"
            required
          />
          <Input
            type="password"
            label="Nhập lại mật khẩu mới"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Nhập lại để xác nhận"
            autoComplete="new-password"
            required
          />
          <Button
            type="submit"
            loading={submitting}
            disabled={submitting}
            className="w-full"
          >
            Đổi mật khẩu và tiếp tục
          </Button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 w-full text-[13px] text-on-surface-variant hover:text-on-surface font-medium flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Đăng xuất
        </button>
      </div>
    </div>
  );
}
