import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo (auto-purges)
interface DemoSession {
  id: string;
  messages: Array<{
    id: string;
    sender: 'userA' | 'userB' | 'ai';
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  lastActivity: Date;
}

interface DemoUser {
  id: string;
  name: string;
  token: string;
  createdAt: Date;
}

// In-memory stores
const demoSessions = new Map<string, DemoSession>();
const demoUsers = new Map<string, DemoUser>();
const demoCouples = new Map<string, { id: string; userAId: string; userBId: string | null }>();

// Auto-purge configuration
const PURGE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const USER_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// Auto-purge function
function purgeExpiredData() {
  const now = new Date();
  
  // Purge expired sessions
  for (const [sessionId, session] of demoSessions.entries()) {
    if (now.getTime() - session.lastActivity.getTime() > SESSION_TIMEOUT_MS) {
      demoSessions.delete(sessionId);
    }
  }
  
  // Purge expired users
  for (const [userId, user] of demoUsers.entries()) {
    if (now.getTime() - user.createdAt.getTime() > USER_TIMEOUT_MS) {
      demoUsers.delete(userId);
    }
  }
}

// Run auto-purge periodically
setInterval(purgeExpiredData, PURGE_INTERVAL_MS);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  // Auto-purge before handling requests
  purgeExpiredData();
  
  switch (action) {
    case 'health':
      return NextResponse.json({
        status: 'ok',
        environment: 'demo',
        storage: 'in-memory',
        autoPurge: 'enabled',
        sessionTimeout: SESSION_TIMEOUT_MS,
        userTimeout: USER_TIMEOUT_MS,
        activeSessions: demoSessions.size,
        activeUsers: demoUsers.size,
        banner: '🚧 DEMO ENVIRONMENT - DATA AUTO-DELETES 🚧'
      });
      
    case 'stats':
      return NextResponse.json({
        sessions: demoSessions.size,
        users: demoUsers.size,
        couples: demoCouples.size,
        lastPurge: new Date().toISOString()
      });
      
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;
  
  // Auto-purge before handling requests
  purgeExpiredData();
  
  switch (action) {
    case 'create_user':
      const { name } = body;
      const userId = `demo_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const token = `demo_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const user: DemoUser = {
        id: userId,
        name,
        token,
        createdAt: new Date()
      };
      
      demoUsers.set(userId, user);
      
      return NextResponse.json({
        userId,
        token,
        message: 'Demo user created (auto-deletes in 1 hour)'
      });
      
    case 'create_couple':
      const { userToken } = body;
      const foundUser = Array.from(demoUsers.values()).find(u => u.token === userToken);
      
      if (!foundUser) {
        return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
      }
      
      const coupleId = `demo_couple_${Date.now()}`;
      const couple = {
        id: coupleId,
        userAId: foundUser.id,
        userBId: null
      };
      
      demoCouples.set(coupleId, couple);
      
      return NextResponse.json({
        coupleId,
        message: 'Demo couple created (auto-deletes when inactive)'
      });
      
    case 'join_couple':
      const { userToken: joinToken, coupleId: joinCoupleId } = body;
      const joinUser = Array.from(demoUsers.values()).find(u => u.token === joinToken);
      const joinCouple = demoCouples.get(joinCoupleId);
      
      if (!joinUser || !joinCouple) {
        return NextResponse.json({ error: 'Invalid user or couple' }, { status: 404 });
      }
      
      if (joinCouple.userAId === joinUser.id) {
        return NextResponse.json({ error: 'Cannot join your own couple' }, { status: 400 });
      }
      
      joinCouple.userBId = joinUser.id;
      
      return NextResponse.json({
        message: 'Joined demo couple (auto-deletes when inactive)'
      });
      
    case 'create_session':
      const { userToken: sessionToken } = body;
      const sessionUser = Array.from(demoUsers.values()).find(u => u.token === sessionToken);
      
      if (!sessionUser) {
        return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
      }
      
      const sessionId = `demo_session_${Date.now()}`;
      const session: DemoSession = {
        id: sessionId,
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date()
      };
      
      demoSessions.set(sessionId, session);
      
      return NextResponse.json({
        sessionId,
        message: 'Demo session created (auto-deletes in 30 minutes)'
      });
      
    case 'send_message':
      const { userToken: messageToken, sessionId: messageSessionId, content, sender } = body;
      const messageUser = Array.from(demoUsers.values()).find(u => u.token === messageToken);
      const messageSession = demoSessions.get(messageSessionId);
      
      if (!messageUser || !messageSession) {
        return NextResponse.json({ error: 'Invalid user or session' }, { status: 404 });
      }
      
      const message = {
        id: `demo_msg_${Date.now()}`,
        sender: sender as 'userA' | 'userB' | 'ai',
        content,
        timestamp: new Date()
      };
      
      messageSession.messages.push(message);
      messageSession.lastActivity = new Date();
      
      return NextResponse.json({
        messageId: message.id,
        message: 'Demo message sent (auto-deletes with session)'
      });
      
    case 'get_messages':
      const { userToken: getToken, sessionId: getSessionId } = body;
      const getUser = Array.from(demoUsers.values()).find(u => u.token === getToken);
      const getSession = demoSessions.get(getSessionId);
      
      if (!getUser || !getSession) {
        return NextResponse.json({ error: 'Invalid user or session' }, { status: 404 });
      }
      
      return NextResponse.json({
        messages: getSession.messages,
        message: 'Demo messages retrieved (auto-deletes with session)'
      });
      
    case 'end_session':
      const { userToken: endToken, sessionId: endSessionId } = body;
      const endUser = Array.from(demoUsers.values()).find(u => u.token === endToken);
      
      if (!endUser) {
        return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
      }
      
      if (demoSessions.has(endSessionId)) {
        demoSessions.delete(endSessionId);
      }
      
      return NextResponse.json({
        message: 'Demo session ended and deleted'
      });
      
    case 'clear_all':
      // Clear all demo data
      demoSessions.clear();
      demoUsers.clear();
      demoCouples.clear();
      
      return NextResponse.json({
        message: 'All demo data cleared'
      });
      
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  // Auto-purge before handling requests
  purgeExpiredData();
  
  switch (action) {
    case 'session':
      const sessionId = searchParams.get('sessionId');
      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
      }
      
      if (demoSessions.has(sessionId)) {
        demoSessions.delete(sessionId);
        return NextResponse.json({ message: 'Demo session deleted' });
      } else {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
    case 'user':
      const userId = searchParams.get('userId');
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }
      
      if (demoUsers.has(userId)) {
        demoUsers.delete(userId);
        return NextResponse.json({ message: 'Demo user deleted' });
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
    case 'all':
      demoSessions.clear();
      demoUsers.clear();
      demoCouples.clear();
      
      return NextResponse.json({ message: 'All demo data deleted' });
      
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
