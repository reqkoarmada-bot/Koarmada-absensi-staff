import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API route: Test Discord Bot Token
app.post('/api/discord/test', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ ok: false, error: 'Token Discord Bot diperlukan' });
    }

    const cleanToken = token.startsWith('Bot ') ? token : `Bot ${token.trim()}`;
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: cleanToken,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        ok: false,
        error: errData.message || 'Token Discord tidak valid atau tidak memiliki akses.',
      });
    }

    const botUser = await response.json();
    return res.json({
      ok: true,
      bot: {
        id: botUser.id,
        username: botUser.username,
        discriminator: botUser.discriminator,
        avatar: botUser.avatar,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message || 'Terjadi kesalahan server internal' });
  }
});

// API route: Fetch recent messages from a channel (to pick attendance announcement)
app.post('/api/discord/channel-messages', async (req, res) => {
  try {
    const { token, channelId, limit = 20 } = req.body;
    if (!token || !channelId) {
      return res.status(400).json({ ok: false, error: 'Token dan Channel ID diperlukan' });
    }

    const cleanToken = token.startsWith('Bot ') ? token : `Bot ${token.trim()}`;
    const cleanChannelId = channelId.trim();

    const response = await fetch(
      `https://discord.com/api/v10/channels/${cleanChannelId}/messages?limit=${Math.min(limit, 50)}`,
      {
        headers: {
          Authorization: cleanToken,
        },
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        ok: false,
        error: errData.message || 'Gagal membaca pesan channel. Pastikan Bot ada di server dan punya izin Read Messages.',
      });
    }

    const messages = await response.json();
    const formatted = messages.map((m: any) => ({
      id: m.id,
      content: m.content,
      author: {
        id: m.author?.id,
        username: m.author?.username,
        global_name: m.author?.global_name,
        avatar: m.author?.avatar,
      },
      timestamp: m.timestamp,
      reactions: (m.reactions || []).map((r: any) => ({
        emoji: r.emoji.id ? `${r.emoji.name}:${r.emoji.id}` : r.emoji.name,
        name: r.emoji.name,
        count: r.count,
      })),
    }));

    return res.json({ ok: true, messages: formatted });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message || 'Gagal mengambil pesan channel' });
  }
});

// API route: Fetch all users who reacted to a specific message with an emoji
app.post('/api/discord/fetch-reactions', async (req, res) => {
  try {
    const { token, channelId, messageId, emoji } = req.body;
    if (!token || !channelId || !messageId) {
      return res.status(400).json({ ok: false, error: 'Token, Channel ID, dan Message ID diperlukan' });
    }

    const cleanToken = token.startsWith('Bot ') ? token : `Bot ${token.trim()}`;
    const cleanChannelId = channelId.trim();
    const cleanMessageId = messageId.trim();

    // If emoji is not specified or empty, default to checking message details first to find active reactions
    let targetEmoji = emoji ? emoji.trim() : null;

    if (!targetEmoji) {
      // First get message to see what emojis exist
      const msgRes = await fetch(
        `https://discord.com/api/v10/channels/${cleanChannelId}/messages/${cleanMessageId}`,
        {
          headers: {
            Authorization: cleanToken,
          },
        }
      );
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        if (msgData.reactions && msgData.reactions.length > 0) {
          const firstR = msgData.reactions[0];
          targetEmoji = firstR.emoji.id ? `${firstR.emoji.name}:${firstR.emoji.id}` : firstR.emoji.name;
        }
      }
    }

    if (!targetEmoji) {
      targetEmoji = '✅'; // fallback common checkmark
    }

    const encodedEmoji = encodeURIComponent(targetEmoji);
    let allUsers: any[] = [];
    let after: string | null = null;
    let keepFetching = true;

    while (keepFetching && allUsers.length < 500) {
      const url = `https://discord.com/api/v10/channels/${cleanChannelId}/messages/${cleanMessageId}/reactions/${encodedEmoji}?limit=100${
        after ? `&after=${after}` : ''
      }`;

      const reactRes = await fetch(url, {
        headers: {
          Authorization: cleanToken,
        },
      });

      if (!reactRes.ok) {
        const errData = await reactRes.json().catch(() => ({}));
        return res.status(reactRes.status).json({
          ok: false,
          error:
            errData.message ||
            `Gagal mengambil reaksi untuk emoji "${targetEmoji}". Pastikan emoji benar dan bot memiliki izin Read Message History.`,
        });
      }

      const usersBatch: any[] = await reactRes.json();
      if (!Array.isArray(usersBatch) || usersBatch.length === 0) {
        keepFetching = false;
      } else {
        allUsers = allUsers.concat(usersBatch);
        if (usersBatch.length < 100) {
          keepFetching = false;
        } else {
          after = usersBatch[usersBatch.length - 1].id;
        }
      }
    }

    const cleanUsers = allUsers.map((u) => ({
      id: u.id,
      username: u.username,
      global_name: u.global_name || u.username,
      avatar: u.avatar,
    }));

    return res.json({
      ok: true,
      emoji: targetEmoji,
      count: cleanUsers.length,
      users: cleanUsers,
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message || 'Gagal membaca reaksi' });
  }
});

// API route: Fetch Guild Roles (to find "koarmada member" role)
app.post('/api/discord/guild-roles', async (req, res) => {
  try {
    const { token, guildId } = req.body;
    if (!token || !guildId) {
      return res.status(400).json({ ok: false, error: 'Token dan Server (Guild) ID diperlukan' });
    }

    const cleanToken = token.startsWith('Bot ') ? token : `Bot ${token.trim()}`;
    const cleanGuildId = guildId.trim();

    const response = await fetch(`https://discord.com/api/v10/guilds/${cleanGuildId}/roles`, {
      headers: {
        Authorization: cleanToken,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        ok: false,
        error: errData.message || 'Gagal mengambil daftar role server.',
      });
    }

    const rawRoles: any[] = await response.json();
    const roles = rawRoles.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      position: r.position,
    }));

    return res.json({ ok: true, roles });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message || 'Gagal mengambil role guild' });
  }
});

// API route: Fetch Guild Members with optional Role filtering (e.g. "koarmada member")
app.post('/api/discord/guild-members', async (req, res) => {
  try {
    const { token, guildId, targetRoleName, targetRoleId } = req.body;
    if (!token || !guildId) {
      return res.status(400).json({ ok: false, error: 'Token dan Server (Guild) ID diperlukan' });
    }

    const cleanToken = token.startsWith('Bot ') ? token : `Bot ${token.trim()}`;
    const cleanGuildId = guildId.trim();

    // If role name given, fetch roles to find its ID
    let filterRoleId = targetRoleId ? targetRoleId.trim() : null;
    let filterRoleName = targetRoleName ? targetRoleName.trim() : null;

    if (!filterRoleId && filterRoleName) {
      const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${cleanGuildId}/roles`, {
        headers: { Authorization: cleanToken },
      });
      if (rolesRes.ok) {
        const rolesList: any[] = await rolesRes.json();
        const matched = rolesList.find(
          (r) => r.name.toLowerCase().trim() === filterRoleName!.toLowerCase()
        );
        if (matched) {
          filterRoleId = matched.id;
          filterRoleName = matched.name;
        }
      }
    }

    const response = await fetch(`https://discord.com/api/v10/guilds/${cleanGuildId}/members?limit=1000`, {
      headers: {
        Authorization: cleanToken,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        ok: false,
        error:
          errData.message ||
          'Gagal mengambil anggota server. Pastikan opsi "SERVER MEMBERS INTENT" diaktifkan di Discord Developer Portal.',
      });
    }

    const rawMembers: any[] = await response.json();
    let filtered = rawMembers.filter((m) => !m.user?.bot);

    if (filterRoleId) {
      filtered = filtered.filter((m) => Array.isArray(m.roles) && m.roles.includes(filterRoleId));
    }

    const members = filtered.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      displayName: m.nick || m.user.global_name || m.user.username,
      avatar: m.user.avatar,
      roles: m.roles,
      joinedAt: m.joined_at,
    }));

    return res.json({
      ok: true,
      count: members.length,
      filterRoleId,
      filterRoleName,
      members,
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message || 'Gagal mengambil data member guild' });
  }
});

// API route: Send Direct Message (DM) to a Discord user
app.post('/api/discord/send-dm', async (req, res) => {
  try {
    const { token, userId, content } = req.body;
    if (!token || !userId || !content) {
      return res.status(400).json({ ok: false, error: 'Token, User ID, dan isi pesan DM diperlukan' });
    }

    const cleanToken = token.startsWith('Bot ') ? token : `Bot ${token.trim()}`;

    // Step 1: Create or open DM channel with recipient
    const channelRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        Authorization: cleanToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_id: userId.trim() }),
    });

    if (!channelRes.ok) {
      const err = await channelRes.json().catch(() => ({}));
      return res.status(channelRes.status).json({
        ok: false,
        error:
          err.message ||
          'Gagal membuka direct message. Pastikan bot dan user berada di server yang sama.',
      });
    }

    const channelData = await channelRes.json();
    const dmChannelId = channelData.id;

    // Step 2: Send message to DM channel
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${dmChannelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: cleanToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: content.trim() }),
    });

    if (!msgRes.ok) {
      const err = await msgRes.json().catch(() => ({}));
      return res.status(msgRes.status).json({
        ok: false,
        error:
          err.message ||
          'User menutup DM atau memblokir bot (Cannot send messages to this user).',
      });
    }

    const msgData = await msgRes.json();
    return res.json({ ok: true, messageId: msgData.id, sentAt: msgData.timestamp });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message || 'Gagal mengirim pesan DM' });
  }
});

// API route: Send batch DM notifications (with rate-limit throttling)
app.post('/api/discord/send-batch-dm', async (req, res) => {
  try {
    const { token, users, content } = req.body;
    if (!token || !Array.isArray(users) || users.length === 0 || !content) {
      return res.status(400).json({ ok: false, error: 'Data batch tidak lengkap' });
    }

    const cleanToken = token.startsWith('Bot ') ? token : `Bot ${token.trim()}`;
    const results: Array<{ id: string; name: string; success: boolean; error?: string }> = [];

    for (const u of users) {
      if (!u.id) {
        results.push({ id: u.id || '', name: u.name || 'Unknown', success: false, error: 'User ID tidak valid' });
        continue;
      }

      try {
        // Open DM channel
        const chanRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
          method: 'POST',
          headers: {
            Authorization: cleanToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ recipient_id: u.id }),
        });

        if (!chanRes.ok) {
          const err = await chanRes.json().catch(() => ({}));
          results.push({ id: u.id, name: u.name, success: false, error: err.message || 'Gagal buat DM' });
          continue;
        }

        const chanData = await chanRes.json();
        const personalizedContent = content
          .replace(/\{nama\}/gi, u.name || 'Member')
          .replace(/\{user\}/gi, `<@${u.id}>`);

        // Send message
        const sendRes = await fetch(`https://discord.com/api/v10/channels/${chanData.id}/messages`, {
          method: 'POST',
          headers: {
            Authorization: cleanToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: personalizedContent }),
        });

        if (sendRes.ok) {
          results.push({ id: u.id, name: u.name, success: true });
        } else {
          const err = await sendRes.json().catch(() => ({}));
          results.push({ id: u.id, name: u.name, success: false, error: err.message || 'DM tertutup' });
        }

        // Throttle 350ms between requests to avoid Discord API rate limits
        await new Promise((resolve) => setTimeout(resolve, 350));
      } catch (e: any) {
        results.push({ id: u.id, name: u.name, success: false, error: e.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return res.json({
      ok: true,
      total: users.length,
      successCount,
      failCount: users.length - successCount,
      results,
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message || 'Gagal menjalankan batch DM' });
  }
});


// Vite Middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server Discord RP Absensi berjalan di http://localhost:${PORT}`);
  });
}

startServer();
