import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export interface OnlineUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  role?: string;
  school_id?: string;
}

interface PresenceContextType {
  onlineUsers: OnlineUser[];
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: [] });

const HEARTBEAT_MS = 20_000;       // Gửi nhịp sống heartbeat mỗi 20s
const POLL_MS = 10_000;            // Cập nhật danh sách online mỗi 10s
const ONLINE_WINDOW_MS = 50_000;   // Coi là online nếu last_seen trong 50s gần nhất

const db = supabase as any;

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: currentUser } = useAuthStore();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const userId = currentUser?.id;
  const userIdRef = useRef<string | undefined>(undefined);
  userIdRef.current = userId;

  useEffect(() => {
    if (!userId || !currentUser) {
      setOnlineUsers([]);
      return;
    }

    let cancelled = false;

    // Heartbeat: Upsert người dùng hiện tại vào bảng user_presence
    const heartbeat = async () => {
      try {
        const { error } = await db
          .from('user_presence')
          .upsert(
            {
              user_id: userId,
              full_name: currentUser.full_name || 'Người dùng',
              avatar_url: currentUser.avatar_url || null,
              role: currentUser.role || 'user',
              school_id: currentUser.school_id || null,
              last_seen: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        if (error) {
          console.warn('[Presence] heartbeat status:', error.message);
        }
      } catch (err) {
        console.warn('[Presence] heartbeat exception:', err);
      }
    };

    // Fetch danh sách người dùng đang online thực tế (hoặc fallback)
    const fetchOnline = async () => {
      try {
        const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
        let query = db
          .from('user_presence')
          .select('user_id, full_name, avatar_url, role, school_id, last_seen')
          .gt('last_seen', cutoff);

        if (currentUser.school_id) {
          query = query.eq('school_id', currentUser.school_id);
        }

        const { data, error } = await query;
        
        if (cancelled) return;

        if (!error && data && data.length > 0) {
          const users: OnlineUser[] = data.map((r: any) => ({
            id: r.user_id,
            full_name: r.full_name || 'Người dùng',
            avatar_url: r.avatar_url || undefined,
            role: r.role || undefined,
            school_id: r.school_id || undefined,
          }));

          // Đảm bảo currentUser luôn nằm ở đầu danh sách online
          if (!users.some(u => u.id === currentUser.id)) {
            users.unshift({
              id: currentUser.id,
              full_name: currentUser.full_name || 'Người dùng',
              avatar_url: currentUser.avatar_url || undefined,
              role: currentUser.role || undefined,
              school_id: currentUser.school_id || undefined,
            });
          }

          setOnlineUsers(users);
        } else {
          // Fallback: Luôn hiển thị tối thiểu currentUser đang đăng nhập
          setOnlineUsers([{
            id: currentUser.id,
            full_name: currentUser.full_name || 'Người dùng',
            avatar_url: currentUser.avatar_url || undefined,
            role: currentUser.role || undefined,
            school_id: currentUser.school_id || undefined,
          }]);
        }
      } catch (err) {
        setOnlineUsers([{
          id: currentUser.id,
          full_name: currentUser.full_name || 'Người dùng',
          avatar_url: currentUser.avatar_url || undefined,
          role: currentUser.role || undefined,
          school_id: currentUser.school_id || undefined,
        }]);
      }
    };

    // Chạy heartbeat & fetch ngay khi mount
    heartbeat().then(fetchOnline);
    const hbTimer = setInterval(heartbeat, HEARTBEAT_MS);
    const pollTimer = setInterval(fetchOnline, POLL_MS);

    // Khi đóng tab hoặc chuyển trang: Xóa nhịp sống để offline tức thì
    const handleUnload = () => {
      const id = userIdRef.current;
      if (id) {
        db.from('user_presence').delete().eq('user_id', id).then(() => {}, () => {});
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      cancelled = true;
      clearInterval(hbTimer);
      clearInterval(pollTimer);
      window.removeEventListener('beforeunload', handleUnload);
      if (userId) {
        db.from('user_presence').delete().eq('user_id', userId).then(() => {}, () => {});
      }
    };
  }, [userId, currentUser?.full_name, currentUser?.avatar_url, currentUser?.role, currentUser?.school_id]);

  return (
    <PresenceContext.Provider value={{ onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = (): PresenceContextType => useContext(PresenceContext);
