import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };

  // Authenticate user
  const session = await auth();
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  await dbConnect();
  const user = await Notification.db.model('User').findOne({ email: session.user.email });
  if (!user) {
    return new Response('User not found', { status: 404 });
  }

  let lastSent = new Date();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial notifications (last 10)
      const initial = await Notification.find({
        $or: [
          { userId: user._id },
          { userId: { $exists: false } }, // system-wide
          { userId: null },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ notifications: initial })}\n\n`));
      lastSent = new Date();

      // Poll for new notifications every 5s
      const interval = setInterval(async () => {
        if (closed) return;
        const since = lastSent;
        const newNotifs = await Notification.find({
          $or: [
            { userId: user._id },
            { userId: { $exists: false } },
            { userId: null },
          ],
          createdAt: { $gt: since },
        })
          .sort({ createdAt: 1 })
          .lean();
        if (newNotifs.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ notifications: newNotifs })}\n\n`));
          lastSent = newNotifs[newNotifs.length - 1].createdAt;
        }
      }, 5000);
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        closed = true;
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
} 