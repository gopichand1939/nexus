import { Router } from 'express';
import { randomUUID } from 'node:crypto';

export function createMockMatrixRouter(config) {
  const router = Router();
  const rooms = new Map(); // roomId -> { id, name, creator, members: Set, events: [] }
  const deviceKeys = new Map(); // userId -> { deviceId -> keys }

  function getUserId(req) {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer dev_token_')) {
      const u = auth.replace('Bearer dev_token_', '').trim();
      return `@${u}:${config.matrixServer}`;
    }
    if (auth.startsWith('Bearer ')) {
      return `@user:${config.matrixServer}`;
    }
    return `@user:${config.matrixServer}`;
  }

  router.get('/versions', (req, res) => {
    res.json({
      versions: ['v1.1', 'v1.2', 'v1.3', 'v1.4', 'v1.5', 'v1.6', 'v1.7', 'v1.8', 'v1.9', 'v1.10', 'v1.11'],
      unstable_features: { 'org.matrix.msc3814': true }
    });
  });

  router.post('/v3/createRoom', (req, res) => {
    const userId = getUserId(req);
    const roomId = `!${randomUUID().replace(/-/g, '')}:${config.matrixServer}`;
    const name = req.body?.name || (req.body?.invite?.[0] ? req.body.invite[0].split(':')[0].replace('@', '') : 'Private Chat');
    const members = new Set([userId, ...(req.body?.invite || [])]);
    
    const room = {
      id: roomId,
      name,
      creator: userId,
      members,
      isDirect: !!req.body?.is_direct,
      events: [
        {
          event_id: `$${randomUUID().replace(/-/g, '')}`,
          type: 'm.room.create',
          sender: userId,
          origin_server_ts: Date.now(),
          content: { creator: userId, room_version: '10' },
          state_key: ''
        },
        {
          event_id: `$${randomUUID().replace(/-/g, '')}`,
          type: 'm.room.name',
          sender: userId,
          origin_server_ts: Date.now(),
          content: { name },
          state_key: ''
        }
      ]
    };

    for (const m of members) {
      room.events.push({
        event_id: `$${randomUUID().replace(/-/g, '')}`,
        type: 'm.room.member',
        sender: userId,
        state_key: m,
        origin_server_ts: Date.now(),
        content: {
          membership: 'join',
          displayname: m.split(':')[0].replace('@', '')
        }
      });
    }

    rooms.set(roomId, room);
    res.json({ room_id: roomId });
  });

  router.get('/v3/sync', (req, res) => {
    const userId = getUserId(req);
    const joinRooms = {};

    for (const [roomId, room] of rooms.entries()) {
      if (room.members.has(userId) || room.creator === userId) {
        joinRooms[roomId] = {
          summary: {
            'm.joined_member_count': room.members.size,
            'm.invited_member_count': 0
          },
          state: {
            events: room.events.filter(e => typeof e.state_key === 'string')
          },
          timeline: {
            events: room.events,
            prev_batch: 't0',
            limited: false
          },
          ephemeral: { events: [] },
          account_data: { events: [] },
          unread_notifications: { notification_count: 0, highlight_count: 0 }
        };
      }
    }

    res.json({
      next_batch: `s_${Date.now()}`,
      rooms: {
        join: joinRooms,
        invite: {},
        leave: {}
      },
      device_lists: { changed: [], left: [] },
      device_one_time_keys_count: { signed_curve25519: 50 }
    });
  });

  router.put('/v3/rooms/:roomId/send/:eventType/:txnId', (req, res) => {
    const userId = getUserId(req);
    const { roomId, eventType, txnId } = req.params;
    let room = rooms.get(roomId);
    if (!room) {
      room = { id: roomId, name: 'Chat', creator: userId, members: new Set([userId]), events: [] };
      rooms.set(roomId, room);
    }

    const eventId = `$${randomUUID().replace(/-/g, '')}`;
    const event = {
      event_id: eventId,
      type: eventType,
      sender: userId,
      origin_server_ts: Date.now(),
      content: req.body || {},
      room_id: roomId,
      unsigned: { age: 0, transaction_id: txnId }
    };

    room.events.push(event);
    res.json({ event_id: eventId });
  });

  const handleState = (req, res) => {
    const userId = getUserId(req);
    const { roomId, eventType, stateKey = '' } = req.params;
    let room = rooms.get(roomId);
    if (!room) {
      room = { id: roomId, name: 'Chat', creator: userId, members: new Set([userId]), events: [] };
      rooms.set(roomId, room);
    }
    const eventId = `$${randomUUID().replace(/-/g, '')}`;
    room.events.push({
      event_id: eventId,
      type: eventType,
      state_key: stateKey,
      sender: userId,
      origin_server_ts: Date.now(),
      content: req.body || {}
    });
    res.json({ event_id: eventId });
  };
  router.put('/v3/rooms/:roomId/state/:eventType', handleState);
  router.put('/v3/rooms/:roomId/state/:eventType/:stateKey', handleState);

  router.get('/v3/rooms/:roomId/messages', (req, res) => {
    const room = rooms.get(req.params.roomId);
    res.json({
      start: 't0',
      end: 't1',
      chunk: room ? room.events : []
    });
  });

  router.get('/v3/rooms/:roomId/members', (req, res) => {
    const room = rooms.get(req.params.roomId);
    const joined = {};
    if (room) {
      for (const m of room.members) {
        joined[m] = { display_name: m.split(':')[0].replace('@', '') };
      }
    }
    res.json({ joined });
  });

  router.get('/v3/rooms/:roomId/joined_members', (req, res) => {
    const room = rooms.get(req.params.roomId);
    const joined = {};
    if (room) {
      for (const m of room.members) {
        joined[m] = { display_name: m.split(':')[0].replace('@', '') };
      }
    }
    res.json({ joined });
  });

  router.post('/v3/rooms/:roomId/join', (req, res) => {
    const userId = getUserId(req);
    const room = rooms.get(req.params.roomId);
    if (room) room.members.add(userId);
    res.json({ room_id: req.params.roomId });
  });

  router.post('/v3/rooms/:roomId/invite', (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (room && req.body?.user_id) room.members.add(req.body.user_id);
    res.json({});
  });

  router.post('/v3/keys/upload', (req, res) => {
    res.json({ one_time_key_counts: { signed_curve25519: 50 } });
  });

  router.post('/v3/keys/query', (req, res) => {
    res.json({ device_keys: {}, failures: {} });
  });

  router.post('/v3/keys/claim', (req, res) => {
    res.json({ one_time_keys: {} });
  });

  router.get('/v3/pushrules/', (req, res) => {
    res.json({ global: {} });
  });

  router.put('/v3/rooms/:roomId/typing/:userId', (req, res) => res.json({}));
  router.post('/v3/rooms/:roomId/receipt/:receiptType/:eventId', (req, res) => res.json({}));
  router.post('/v3/rooms/:roomId/read_markers', (req, res) => res.json({}));
  router.put('/v3/user/:userId/rooms/:roomId/tags/:tag', (req, res) => res.json({}));
  router.delete('/v3/user/:userId/rooms/:roomId/tags/:tag', (req, res) => res.json({}));
  router.use('/v3', (req, res) => res.json({}));

  return router;
}
