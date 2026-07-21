import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
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
  LoaderCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import schoolLogo from '../assets/logo.jpg';

export function Login() {
  const navigate = useNavigate();
  const { setUser, setAccessToken, setLoading, setError, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    // Tạm thời tắt dark mode trên trang đăng nhập (luôn hiển thị giao diện sáng)
    const htmlElement = document.documentElement;
    const hasDark = htmlElement.classList.contains('dark');
    if (hasDark) {
      htmlElement.classList.remove('dark');
    }

    return () => {
      if (hasDark) {
        htmlElement.classList.add('dark');
      }
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let loginEmail = email.trim();
      // Non-admin staff log in with their phone number; admin logs in with
      // the literal "admin" username. Neither is a real email, so we map
      // both to the same synthetic auth domain used when the account was created.
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

      // Fetch user profile from the database
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

      // Set auth state
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
    <div className="flex h-full w-full bg-slate-50 font-sans text-slate-800 relative overflow-hidden select-none">
      
      {/* ─── LEFT COLUMN: BRANDING & FEATURES (Hidden on Mobile) ─── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between relative overflow-hidden bg-sky-50/50 border-r border-slate-200/60 p-12 xl:p-16">
        {/* Accents phát sáng nền */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-400/10 blur-[100px] pointer-events-none" />
        
        {/* Top Branding Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            {!logoError ? (
              <img src={schoolLogo} alt="Logo" onError={() => setLogoError(true)} className="h-full w-full object-contain rounded-lg" />
            ) : (
              <GraduationCap className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <div className="font-black tracking-widest text-[16px] uppercase text-slate-900 leading-tight">
              Doraemon<span className="text-primary"> Kids</span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-0.5">
              Hệ thống Quản lý Trường Mầm non
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 my-auto max-w-xl">
          <h1 className="text-4xl xl:text-5.5xl font-black leading-[1.15] tracking-tight text-slate-900 font-playfair">
            Ươm mầm <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-600">
              tương lai hạnh phúc.
            </span>
          </h1>
          <p className="mt-4 text-[15px] xl:text-[16px] text-slate-600 font-medium leading-relaxed">
            Hệ thống quản lý thông minh giúp tối ưu hóa vận hành trường học, theo dõi sát sao sự phát triển của bé và kết nối phụ huynh chặt chẽ.
          </p>

          {/* Feature List (CIC Style) */}
          <div className="mt-10 space-y-3.5">
            {/* Feature 1 */}
            <div className="flex items-center gap-4 p-4.5 rounded-2xl bg-white/70 border border-slate-200/40 backdrop-blur-md hover:bg-white/90 transition-all duration-300 shadow-3xs">
              <div className="text-primary flex-shrink-0 bg-primary/5 p-2.5 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-slate-800">Quản lý Học sinh & Lớp học</h3>
                <p className="text-[12px] text-slate-500 mt-0.5 font-medium">Theo dõi hồ sơ học sinh, xếp lớp nhanh chóng và phân công giáo viên khoa học.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-4 p-4.5 rounded-2xl bg-white/70 border border-slate-200/40 backdrop-blur-md hover:bg-white/90 transition-all duration-300 shadow-3xs">
              <div className="text-primary flex-shrink-0 bg-primary/5 p-2.5 rounded-xl">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-slate-800">Dinh dưỡng & Sức khỏe</h3>
                <p className="text-[12px] text-slate-500 mt-0.5 font-medium">Lập thực đơn phong phú theo tuần, theo dõi chỉ số chiều cao, cân nặng định kỳ.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-4 p-4.5 rounded-2xl bg-white/70 border border-slate-200/40 backdrop-blur-md hover:bg-white/90 transition-all duration-300 shadow-3xs">
              <div className="text-primary flex-shrink-0 bg-primary/5 p-2.5 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-slate-800">Kế hoạch Tuần & Hoạt động</h3>
                <p className="text-[12px] text-slate-500 mt-0.5 font-medium">Đồng bộ lịch học, hoạt động vui chơi và kế hoạch giảng dạy trực quan.</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-center gap-4 p-4.5 rounded-2xl bg-white/70 border border-slate-200/40 backdrop-blur-md hover:bg-white/90 transition-all duration-300 shadow-3xs">
              <div className="text-primary flex-shrink-0 bg-primary/5 p-2.5 rounded-xl">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-slate-800">Kết nối & Tương tác Phụ huynh</h3>
                <p className="text-[12px] text-slate-500 mt-0.5 font-medium">Gửi thông báo nhanh chóng, điểm danh hàng ngày và tiếp nhận ý kiến hai chiều.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="relative z-10 flex items-center gap-5 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase">
          <span>Phiên bản v1.2</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span>Bảo mật SSL 256-bit</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> 99.9% Uptime
          </span>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: LOGIN FORM ─── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-white transition-colors duration-300">
        <div className="w-full max-w-[420px] lg:-mt-6">
          
          {/* Logo & Headers */}
          <div className="flex flex-col items-center text-center mb-7 w-full">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm transition-transform hover:scale-105 duration-500">
              {!logoError ? (
                <img src={schoolLogo} alt="School Logo" className="h-full w-full object-contain rounded-lg" />
              ) : (
                <GraduationCap className="w-10 h-10 text-primary" />
              )}
            </div>
            
            <h2 className="text-[12px] font-black tracking-[0.18em] uppercase text-slate-400 mb-1 flex justify-center w-full">
              Hà Tĩnh
            </h2>
            <h3 className="text-[20px] sm:text-[22px] font-black tracking-wider uppercase leading-snug flex justify-center w-full text-slate-900 font-playfair">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-700">
                Trường Mầm Non Doraemon
              </span>
            </h3>
            <p className="mt-1 text-[11px] font-bold text-slate-400 tracking-[0.15em] uppercase flex justify-center w-full">
              Hệ thống Quản lý tổng thể trường học
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-200"></div>
            <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Đăng nhập hệ thống</span>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-200"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100 flex items-center justify-center text-center">
                {error}
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-2xs font-black uppercase tracking-wider text-slate-400">
                Tên đăng nhập hoặc Email
              </label>
              <div className="relative group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <User size={17} className="shrink-0 text-slate-400 group-focus-within:text-primary" />
                <input
                  id="email"
                  type="text"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Admin, số điện thoại hoặc email"
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 font-semibold"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-2xs font-black uppercase tracking-wider text-slate-400">
                Mật khẩu
              </label>
              <div className="relative group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <Lock size={17} className="shrink-0 text-slate-400 group-focus-within:text-primary" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 pr-8 font-semibold"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
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
                  className="w-4 h-4 rounded border-slate-200 text-primary focus:ring-primary/10 bg-slate-50/50"
                />
                <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors font-medium">
                  Ghi nhớ đăng nhập
                </span>
              </label>
              
              <button
                type="button"
                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-primary text-white font-bold text-[14px] shadow-md shadow-primary/10 hover:bg-primary/95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-200 cursor-pointer"
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
          <div className="mt-14 text-center text-2xs text-slate-400 font-bold tracking-widest uppercase">
            AN TOÀN — YÊU THƯƠNG — TÔN TRỌNG
          </div>
        </div>
      </div>
    </div>
  );
}
