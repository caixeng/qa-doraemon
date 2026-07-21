import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  LogIn, 
  GraduationCap, 
  User, 
  Lock, 
  Users, 
  Utensils, 
  Calendar, 
  HeartHandshake,
  LoaderCircle,
  Sun,
  Moon,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useTheme, PRIMARY_COLORS } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import schoolLogo from '../assets/logo.jpg';

export function Login() {
  const navigate = useNavigate();
  const { setUser, setAccessToken, setLoading, setError, error } = useAuthStore();
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let loginEmail = email.trim();
      if (!loginEmail.includes('@')) {
        loginEmail = `${loginEmail.toLowerCase()}@doraemon.edu.vn`;
      }

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

      if (authError) {
        if (
          authError.message === 'Invalid login credentials' ||
          authError.message === 'Email not confirmed'
        ) {
          throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
        }
        throw authError;
      }

      if (!authData.session) {
        throw new Error('Không thể thiết lập phiên đăng nhập.');
      }

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', loginEmail)
        .single();

      const profile = profileData as any;

      if (profileError || !profile) {
        throw new Error(
          'Không tìm thấy hồ sơ người dùng. Liên hệ quản trị viên.'
        );
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        throw new Error(
          'Tài khoản đã bị vô hiệu hóa. Liên hệ quản trị viên.'
        );
      }

      setAccessToken(authData.session.access_token);
      setUser({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        job_title: profile.job_title,
        is_active: profile.is_active,
        school_id: profile.school_id,
      });
      setLoading(false);

      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-background font-sans text-on-surface relative overflow-hidden select-none transition-colors duration-300">
      
      {/* ─── THEME & COLOR SELECTOR (Top Right Floating Bar) ─── */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50 flex items-center gap-3 bg-surface/90 backdrop-blur-md px-3.5 py-2 rounded-full border border-outline-variant shadow-lg transition-all">
        {/* Primary Color Swatches */}
        <div className="flex items-center gap-1.5 border-r border-outline-variant/60 pr-2.5">
          {PRIMARY_COLORS.map(({ id, name, hex }) => {
            const active = primaryColor === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPrimaryColor(id)}
                title={name}
                className={cn(
                  'grid h-4.5 w-4.5 place-items-center rounded-full transition-transform hover:scale-110 cursor-pointer',
                  active && 'scale-110'
                )}
                style={{
                  background: hex,
                  ...(active
                    ? { boxShadow: `0 0 0 2px var(--color-surface, #fff), 0 0 0 3.5px ${hex}` }
                    : {})
                }}
              >
                {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
              </button>
            );
          })}
        </div>

        {/* Theme Light / Dark Switcher */}
        <div className="flex items-center gap-1">
          {[
            { value: 'light' as const, icon: Sun, title: 'Giao diện Sáng' },
            { value: 'dark' as const, icon: Moon, title: 'Giao diện Tối' },
          ].map(({ value, icon: Icon, title }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                'p-1.5 rounded-lg transition-all cursor-pointer',
                theme === value
                  ? 'bg-primary text-on-primary shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              )}
              title={title}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* ─── LEFT COLUMN: BRANDING & FEATURES (Hidden on Mobile) ─── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between relative overflow-hidden bg-surface-container-low/40 border-r border-outline-variant p-12 xl:p-16">
        {/* Accents phát sáng nền */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-400/10 blur-[100px] pointer-events-none" />
        
        {/* Top Branding Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-outline-variant bg-surface p-1.5 shadow-xs">
            {!logoError ? (
              <img src={schoolLogo} alt="Logo" onError={() => setLogoError(true)} className="h-full w-full object-contain rounded-lg" />
            ) : (
              <GraduationCap className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <div className="font-black tracking-widest text-[16px] uppercase text-on-surface leading-tight">
              Doraemon<span className="text-primary"> Kids</span>
            </div>
            <div className="text-[10px] text-on-surface-variant font-bold tracking-wider uppercase mt-0.5">
              Hệ thống Quản lý Trường Mầm non
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 my-auto max-w-xl">
          <h1 className="text-4xl xl:text-5.5xl font-black leading-[1.15] tracking-tight text-on-surface font-playfair">
            Ươm mầm <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-500">
              tương lai hạnh phúc.
            </span>
          </h1>
          <p className="mt-4 text-[15px] xl:text-[16px] text-on-surface-variant font-medium leading-relaxed">
            Hệ thống quản lý thông minh giúp tối ưu hóa vận hành trường học, theo dõi sát sao sự phát triển của bé và kết nối phụ huynh chặt chẽ.
          </p>

          {/* Feature List */}
          <div className="mt-10 space-y-3.5">
            {/* Feature 1 */}
            <div className="flex items-center gap-4 p-4.5 rounded-2xl bg-surface/70 border border-outline-variant/60 backdrop-blur-md hover:bg-surface transition-all duration-300 shadow-3xs">
              <div className="text-primary flex-shrink-0 bg-primary/10 p-2.5 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-on-surface">Quản lý Học sinh & Lớp học</h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5 font-medium">Theo dõi hồ sơ học sinh, xếp lớp nhanh chóng và phân công giáo viên khoa học.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-4 p-4.5 rounded-2xl bg-surface/70 border border-outline-variant/60 backdrop-blur-md hover:bg-surface transition-all duration-300 shadow-3xs">
              <div className="text-primary flex-shrink-0 bg-primary/10 p-2.5 rounded-xl">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-on-surface">Dinh dưỡng & Sức khỏe</h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5 font-medium">Lập thực đơn phong phú theo tuần, theo dõi chỉ số chiều cao, cân nặng định kỳ.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-4 p-4.5 rounded-2xl bg-surface/70 border border-outline-variant/60 backdrop-blur-md hover:bg-surface transition-all duration-300 shadow-3xs">
              <div className="text-primary flex-shrink-0 bg-primary/10 p-2.5 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-on-surface">Kế hoạch Tuần & Hoạt động</h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5 font-medium">Đồng bộ lịch học, hoạt động vui chơi và kế hoạch giảng dạy trực quan.</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-center gap-4 p-4.5 rounded-2xl bg-surface/70 border border-outline-variant/60 backdrop-blur-md hover:bg-surface transition-all duration-300 shadow-3xs">
              <div className="text-primary flex-shrink-0 bg-primary/10 p-2.5 rounded-xl">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-on-surface">Kết nối & Tương tác Phụ huynh</h3>
                <p className="text-[12px] text-on-surface-variant mt-0.5 font-medium">Gửi thông báo nhanh chóng, điểm danh hàng ngày và tiếp nhận ý kiến hai chiều.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="relative z-10 flex items-center gap-5 text-[10.5px] font-bold text-on-surface-variant/70 tracking-wider uppercase">
          <span>Phiên bản v1.2</span>
          <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
          <span>Bảo mật SSL 256-bit</span>
          <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> 99.9% Uptime
          </span>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: LOGIN FORM ─── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-surface transition-colors duration-300">
        <div className="w-full max-w-[420px] lg:-mt-6">
          
          {/* Logo & Headers */}
          <div className="flex flex-col items-center text-center mb-7 w-full">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-low p-1.5 shadow-sm transition-transform hover:scale-105 duration-500">
              {!logoError ? (
                <img src={schoolLogo} alt="School Logo" className="h-full w-full object-contain rounded-lg" />
              ) : (
                <GraduationCap className="w-10 h-10 text-primary" />
              )}
            </div>
            
            <h2 className="text-[12px] font-black tracking-[0.18em] uppercase text-on-surface-variant/70 mb-1 flex justify-center w-full">
              Hà Tĩnh
            </h2>
            <h3 className="text-[20px] sm:text-[22px] font-black tracking-wider uppercase leading-snug flex justify-center w-full text-on-surface font-playfair">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-600">
                Trường Mầm Non Doraemon
              </span>
            </h3>
            <p className="mt-1 text-[11px] font-bold text-on-surface-variant/70 tracking-[0.15em] uppercase flex justify-center w-full">
              Hệ thống Quản lý tổng thể trường học
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-outline-variant"></div>
            <span className="text-xs font-bold text-on-surface-variant/70 tracking-widest uppercase">Đăng nhập hệ thống</span>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-outline-variant"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-error-container/40 text-error text-xs font-semibold rounded-xl border border-error-container flex items-center justify-center text-center">
                {error}
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-2xs font-black uppercase tracking-wider text-on-surface-variant">
                Tên đăng nhập hoặc Email
              </label>
              <div className="relative flex items-center">
                <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70 pointer-events-none z-10" />
                <input
                  id="email"
                  type="text"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Admin, số điện thoại hoặc email"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low/60 pl-10 pr-3.5 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 font-semibold focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-2xs font-black uppercase tracking-wider text-on-surface-variant">
                Mật khẩu
              </label>
              <div className="relative flex items-center">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70 pointer-events-none z-10" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low/60 pl-10 pr-10 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 font-semibold focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer z-10"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Ghi nhớ & Quên mật khẩu */}
            <div className="flex justify-between items-center pt-1 pb-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/10 bg-surface-container-low"
                />
                <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors font-medium">
                  Ghi nhớ đăng nhập
                </span>
              </label>
              
              <button
                type="button"
                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-primary text-on-primary font-bold text-[14px] shadow-md shadow-primary/20 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-200 cursor-pointer"
            >
              {isSubmitting ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={17} />
                  <span>Đăng nhập</span>
                </>
              )}
            </button>
          </form>

          {/* Slogan */}
          <div className="mt-14 text-center text-2xs text-on-surface-variant/60 font-bold tracking-widest uppercase">
            AN TOÀN — YÊU THƯƠNG — TÔN TRỌNG
          </div>
        </div>
      </div>
    </div>
  );
}
