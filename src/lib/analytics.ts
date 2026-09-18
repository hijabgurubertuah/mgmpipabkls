import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const ANALYTICS_DOC_REF = 'analytics/visitors';
const ACTIVE_SESSIONS_COLLECTION = 'active_sessions';
const LOCAL_TOTAL_VISITS_KEY = 'real_total_visits_v2';
const VISITOR_ID_KEY = 'mgmp_unique_visitor_id_v2';
const LAST_VISIT_DAY_KEY = 'mgmp_last_visit_day_v2';

/**
 * Check if the current agent/client is an automated bot or web crawler
 */
export function isBotOrCrawler(): boolean {
  try {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return true;

    // Check navigator.webdriver (common in automated headless browser tools)
    if (navigator.webdriver) return true;

    const ua = navigator.userAgent || '';
    const botPattern =
      /(bot|spider|crawler|crawl|slurp|googlebot|bingbot|yandex|baiduspider|duckduckbot|facebookexternalhit|whatsapp|telegrambot|twitterbot|pinterest|discordbot|lighthouse|headless|phantomjs|petalbot|semrush|ahrefs)/i;
    
    return botPattern.test(ua);
  } catch {
    return false;
  }
}

/**
 * Generate or retrieve a persistent unique visitor ID for this device/browser
 */
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = 'vis_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return 'vis_' + Math.random().toString(36).substring(2, 11);
  }
}

/**
 * Get or create temporary session ID for active online presence tracking
 */
export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('real_visitor_session_id_v2');
    if (!id) {
      id = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('real_visitor_session_id_v2', id);
    }
    return id;
  } catch {
    return 'sess_' + Math.random().toString(36).substring(2, 11);
  }
}

/**
 * Manually reset visitor counter to 0 (or custom number) in Firestore and local caches
 */
export async function resetVisitorCounter(targetCount: number = 0): Promise<boolean> {
  try {
    // Clear old legacy and current local storage caches
    try {
      localStorage.removeItem('real_total_visits_v1');
      localStorage.setItem(LOCAL_TOTAL_VISITS_KEY, String(targetCount));
      localStorage.removeItem(LAST_VISIT_DAY_KEY);
      sessionStorage.clear();
    } catch {
      // ignore
    }

    if (!db) return false;

    const analyticsRef = doc(db, ANALYTICS_DOC_REF);
    await setDoc(
      analyticsRef,
      {
        totalVisits: Math.max(0, targetCount),
        lastReset: Date.now(),
        lastResetDate: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Failed to reset visitor counter:', error);
    return false;
  }
}

/**
 * Initialize real-time visitor count and online user session tracking synced via Firebase Firestore
 */
export function initRealtimeVisitorCounter(
  onUpdate: (stats: { totalVisits: number; onlineUsers: number }) => void
): () => void {
  const isBot = isBotOrCrawler();
  const sessionId = getSessionId();
  let unsubVisitorSnapshot: (() => void) | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  let pollOnlineInterval: ReturnType<typeof setInterval> | null = null;

  let currentTotalVisits = 0;
  let currentOnlineUsers = 1;

  // Read local storage cache if available
  try {
    const cachedTotal = localStorage.getItem(LOCAL_TOTAL_VISITS_KEY);
    if (cachedTotal !== null) {
      const parsed = parseInt(cachedTotal, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        currentTotalVisits = parsed;
      }
    }
  } catch {
    // ignore
  }

  const notify = () => {
    onUpdate({
      totalVisits: currentTotalVisits,
      onlineUsers: currentOnlineUsers,
    });
  };

  // Immediate initial notification
  notify();

  if (!db) {
    return () => {};
  }

  const firestoreDb = db;
  const analyticsRef = doc(firestoreDb, ANALYTICS_DOC_REF);
  const sessionRef = doc(firestoreDb, ACTIVE_SESSIONS_COLLECTION, sessionId);

  // 1. Only increment total visits for REAL human visitors (1 visit per visitor per day)
  if (!isBot) {
    const todayStr = new Date().toISOString().slice(0, 10); // Format YYYY-MM-DD
    let lastVisitDay = '';
    try {
      lastVisitDay = localStorage.getItem(LAST_VISIT_DAY_KEY) || '';
    } catch {
      // ignore
    }

    const sessionIncrementKey = 'mgmp_visited_session_' + sessionId;
    const hasVisitedSession = sessionStorage.getItem(sessionIncrementKey);

    // Only count if visitor has NOT been counted today on this device and not in this session
    if (lastVisitDay !== todayStr && !hasVisitedSession) {
      try {
        localStorage.setItem(LAST_VISIT_DAY_KEY, todayStr);
        sessionStorage.setItem(sessionIncrementKey, '1');
      } catch {
        // ignore
      }

      getDoc(analyticsRef)
        .then((snapshot) => {
          if (!snapshot.exists()) {
            return setDoc(analyticsRef, {
              totalVisits: 1,
              createdAt: Date.now(),
              lastVisitAt: Date.now(),
            });
          } else {
            const data = snapshot.data();
            // If data contains old dummy baseline (>= 15420), reset cleanly
            if (typeof data.totalVisits === 'number' && data.totalVisits >= 15420 && !data.lastReset) {
              return setDoc(
                analyticsRef,
                {
                  totalVisits: 1,
                  lastReset: Date.now(),
                  lastResetDate: new Date().toISOString(),
                  lastVisitAt: Date.now(),
                },
                { merge: true }
              );
            }
            return updateDoc(analyticsRef, {
              totalVisits: increment(1),
              lastVisitAt: Date.now(),
            });
          }
        })
        .catch(() => {
          currentTotalVisits += 1;
          try {
            localStorage.setItem(LOCAL_TOTAL_VISITS_KEY, String(currentTotalVisits));
          } catch {
            // ignore
          }
          notify();
        });
    }
  }

  // 2. Listen to real-time updates for total visitors from Firestore
  try {
    unsubVisitorSnapshot = onSnapshot(
      analyticsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.totalVisits === 'number') {
            // If the database document still has the old 15420+ dummy baseline, reset it cleanly
            if (data.totalVisits >= 15420 && !data.lastReset) {
              resetVisitorCounter(1).catch(() => {});
              currentTotalVisits = 1;
            } else {
              currentTotalVisits = data.totalVisits;
            }
            try {
              localStorage.setItem(LOCAL_TOTAL_VISITS_KEY, String(currentTotalVisits));
            } catch {
              // ignore
            }
            notify();
          }
        }
      },
      () => {
        // Fallback silently
      }
    );
  } catch {
    // ignore
  }

  // 3. Heartbeat for active online session (only for human viewers with active visible tabs)
  if (!isBot) {
    const sendHeartbeat = () => {
      if (document.visibilityState === 'hidden') return;
      setDoc(
        sessionRef,
        {
          lastActive: Date.now(),
          sessionId,
        },
        { merge: true }
      ).catch(() => {});
    };

    sendHeartbeat();
    heartbeatInterval = setInterval(sendHeartbeat, 15000); // 15 seconds heartbeat

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Calculate active online users (active within last 40 seconds)
    const sessionsCol = collection(firestoreDb, ACTIVE_SESSIONS_COLLECTION);

    const updateOnlineCount = async () => {
      try {
        const activeThreshold = Date.now() - 40000;
        const q = query(sessionsCol, where('lastActive', '>=', activeThreshold));
        const snap = await getDocs(q);
        currentOnlineUsers = Math.max(1, snap.size);
        notify();
      } catch {
        // ignore
      }
    };

    updateOnlineCount();
    pollOnlineInterval = setInterval(updateOnlineCount, 10000); // Check every 10s

    const handleUnload = () => {
      deleteDoc(sessionRef).catch(() => {});
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (unsubVisitorSnapshot) unsubVisitorSnapshot();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (pollOnlineInterval) clearInterval(pollOnlineInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
      deleteDoc(sessionRef).catch(() => {});
    };
  }

  return () => {
    if (unsubVisitorSnapshot) unsubVisitorSnapshot();
  };
}

