const HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "same-origin"
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: HEADERS });

const clean = (value, max) =>
  String(value == null ? "" : value).trim().slice(0, max);

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

const LEAD_TTL = 31536000;
const CHAT_TTL = 604800;
const RATE_TTL = 600;
const MAX_CHAT_REQUESTS = 20;

function leadId() {
  return "CHAT" + Date.now().toString(36).toUpperCase();
}

function validConversationId(value) {
  return /^[A-Za-z0-9_-]{16,100}$/.test(value);
}

function baseReply(message) {
  const q = message.toLowerCase();

  if (q.includes("price") || q.includes("cost")) {
    return "Merqiva currently offers a focused GCC maritime opportunity-intelligence service at $299/month, with 30 researched opportunities delivered monthly. We can also discuss a pilot.";
  }

  if (q.includes("guarantee")) {
    return "Merqiva guarantees the quality of the opportunity definition against agreed qualification criteria. It does not guarantee replies, meetings, contracts, or revenue.";
  }

  if (q.includes("how") || q.includes("work")) {
    return "Merqiva turns market signals into evidence-backed opportunities by evaluating company fit, product fit, fleet context, decision makers, buying signals, Why Now, and the next sales action.";
  }

  if (q.includes("free") || q.includes("sample")) {
    return "You can request 10 free opportunities. Tell us what you sell and which GCC market you want to target.";
  }

  if (q.includes("contact") || q.includes("email")) {
    return "You can contact the team at sales@merqivaintel.com. You can also leave your work email here and we’ll capture the conversation.";
  }

  return "I can help with Merqiva’s service, pricing, qualification, guarantee, sample opportunities, or next steps. Tell me what you sell and which market you are targeting.";
}

async function rateLimit(request, env) {
  if (!env.LEADS_KV) return false;

  const ip = clean(request.headers.get("CF-Connecting-IP") || "unknown", 80);
  const bucket = Math.floor(Date.now() / (RATE_TTL * 1000));
  const key = `chat-rate:${ip}:${bucket}`;
  const current = Number(await env.LEADS_KV.get(key) || "0");

  if (current >= MAX_CHAT_REQUESTS) return true;

  await env.LEADS_KV.put(key, String(current + 1), {
    expirationTtl: RATE_TTL
  });

  return false;
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const id = clean(url.searchParams.get("conversation"), 100);

    if (!id || !validConversationId(id)) {
      return json({ success: false, error: "Invalid conversation" }, 400);
    }

    if (!env.LEADS_KV) {
      return json({ success: true, messages: [] });
    }

    const history = safeParse(
      await env.LEADS_KV.get("chat:" + id) || "[]",
      []
    );

    const messages = Array.isArray(history)
      ? history.slice(-30).map(item => ({
          role: item?.role === "user" ? "user" : "bot",
          message: clean(item?.message, 4000),
          at: clean(item?.at, 40)
        })).filter(item => item.message)
      : [];

    return json({ success: true, messages });
  } catch (error) {
    console.error("Chat history error", error);
    return json({ success: false, error: "Chat unavailable" }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (await rateLimit(request, env)) {
      return json({ success: false, error: "Too many requests" }, 429);
    }

    const body = await request.json();
    const suppliedId = clean(body.conversationId, 100);
    const id = validConversationId(suppliedId)
      ? suppliedId
      : crypto.randomUUID();

    const message = clean(body.message, 2000);
    const name = clean(body.name, 100);
    const email = clean(body.email, 200).toLowerCase();

    if (!message) {
      return json({ success: false, error: "Message is required" }, 400);
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return json({ success: false, error: "Invalid email" }, 400);
    }

    let history = [];
    if (env.LEADS_KV) {
      history = safeParse(
        await env.LEADS_KV.get("chat:" + id) || "[]",
        []
      );
      if (!Array.isArray(history)) history = [];
    }

    const now = new Date().toISOString();
    const reply = baseReply(message);

    history.push({ role: "user", message, at: now });
    history.push({ role: "bot", message: reply, at: new Date().toISOString() });

    if (env.LEADS_KV) {
      await env.LEADS_KV.put(
        "chat:" + id,
        JSON.stringify(history.slice(-30)),
        { expirationTtl: CHAT_TTL }
      );
    }

    let leadCaptured = false;

    /*
     * Email is enough to create a lead; name is optional in the UI.
     * One conversation updates one lead instead of creating a duplicate on every message.
     */
    if (email && env.LEADS_KV) {
      const conversationLeadKey = "chatlead:" + id;
      let leadKey = await env.LEADS_KV.get(conversationLeadKey);
      let lead;

      if (leadKey) {
        lead = safeParse(await env.LEADS_KV.get(leadKey) || "{}", {});
        if (!lead || typeof lead !== "object") lead = {};

        lead.name = name || lead.name || "";
        lead.email = email;
        lead.message = "Chat inquiry: " + message;
        lead.lastMessage = message;
        lead.updatedAt = new Date().toISOString();
        lead.version = 3;
      } else {
        const lid = leadId();
        leadKey = "lead:" + lid;
        lead = {
          id: lid,
          name,
          email,
          company: "",
          country: "",
          offering: "",
          market: "",
          message: "Chat inquiry: " + message,
          lastMessage: message,
          status: "new",
          source: "website-chat",
          conversationId: id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 3
        };

        const index = safeParse(
          await env.LEADS_KV.get("leads:index") || "[]",
          []
        );
        const nextIndex = Array.isArray(index) ? index : [];
        nextIndex.unshift(lid);

        await env.LEADS_KV.put(
          "leads:index",
          JSON.stringify(nextIndex.slice(0, 1000)),
          { expirationTtl: LEAD_TTL }
        );

        await env.LEADS_KV.put(
          conversationLeadKey,
          leadKey,
          { expirationTtl: LEAD_TTL }
        );
      }

      await env.LEADS_KV.put(
        leadKey,
        JSON.stringify(lead),
        { expirationTtl: LEAD_TTL }
      );

      await env.LEADS_KV.put(
        "email:" + email,
        lead.id,
        { expirationTtl: LEAD_TTL }
      );

      leadCaptured = true;
    }

    return json({
      success: true,
      reply,
      conversationId: id,
      leadCaptured
    });
  } catch (error) {
    console.error("Chat error", error);
    return json({ success: false, error: "Chat unavailable" }, 500);
  }
}
