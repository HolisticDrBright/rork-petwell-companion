// ai-chat — conversational pet-care assistant. The server assembles pet context
// deterministically and runs the safety policy BEFORE the model: an emergency or
// suspected-poisoning message forces a SAFETY DIRECTIVE the model must lead with,
// and the deterministic banner is prepended to the reply regardless of the model.
// The assistant never diagnoses or treats.
import { handleAi } from "../_shared/runtime.ts";
import { MODELS } from "../_shared/provider.ts";
import { CHAT_PROMPT, PROMPT_VERSIONS } from "../_shared/prompts.ts";
import { chatSchema } from "../_shared/schemas.ts";
import { logGeneration } from "../_shared/log.ts";
import { assessInput, refusalFor, reviewOutput, withDisclaimer } from "../_shared/safety.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

async function buildContext(
  svc: SupabaseClient,
  userId: string,
  petId: string | null,
  message: string,
): Promise<{ text: string; used: string[] }> {
  const parts: string[] = [];
  const used: string[] = [];
  if (petId) {
    try {
      const { data: pet } = await svc
        .from("pets")
        .select("*, pet_conditions(label), pet_allergies(label)")
        .eq("id", petId)
        .eq("owner_id", userId)
        .maybeSingle();
      if (pet) {
        const p = pet as Record<string, unknown>;
        const conds = Array.isArray(p.pet_conditions) ? (p.pet_conditions as { label: string }[]).map((c) => c.label) : [];
        const allergies = Array.isArray(p.pet_allergies) ? (p.pet_allergies as { label: string }[]).map((a) => a.label) : [];
        parts.push(
          `Pet: ${p.name ?? "?"} (${p.species ?? "?"}${p.breed ? `, ${p.breed}` : ""}${p.sex ? `, ${p.sex}` : ""}).` +
            (conds.length ? ` Conditions: ${conds.join(", ")}.` : "") +
            (allergies.length ? ` Allergies: ${allergies.join(", ")}.` : ""),
        );
        used.push("pet profile");
      }
    } catch {
      // best-effort
    }
    try {
      const { data: events } = await svc
        .from("timeline_events")
        .select("*")
        .eq("pet_id", petId)
        .order("created_at", { ascending: false })
        .limit(6);
      if (Array.isArray(events) && events.length) {
        const lines = events
          .map((e) => {
            const ev = e as Record<string, unknown>;
            return `- ${(ev.title ?? ev.event_type ?? ev.note ?? "event") as string}`;
          })
          .join("\n");
        parts.push(`Recent timeline:\n${lines}`);
        used.push("recent timeline");
      }
    } catch {
      // best-effort
    }
  }
  // Toxin reference context when the message mentions poisoning.
  if (/\b(toxic|poison|ate|swallowed|ingest)/i.test(message)) {
    try {
      const { data: tox } = await svc.from("toxin_references").select("name, species, severity, emergency_text").limit(40);
      const hit = (tox ?? []).find((t) => {
        const name = String((t as { name?: string }).name ?? "").toLowerCase();
        return name && message.toLowerCase().includes(name.split(" ")[0]);
      });
      if (hit) {
        const h = hit as { name: string; emergency_text?: string };
        parts.push(`Toxin reference: ${h.name}. ${h.emergency_text ?? "Treat as urgent."}`);
        used.push("toxin reference");
      }
    } catch {
      // best-effort
    }
  }
  return { text: parts.join("\n\n"), used };
}

Deno.serve((req) =>
  handleAi(req, async (ctx, body) => {
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const petId = typeof body.petId === "string" ? body.petId : null;
    let threadId = typeof body.threadId === "string" ? body.threadId : null;
    const includeContext = body.includeContext !== false;
    if (!message) return { ok: false, error: "Please type a message." };

    // Deterministic safety FIRST — the model cannot lower this.
    const safety = assessInput(message);

    const ctxBlock = includeContext ? await buildContext(ctx.svc, ctx.caller.userId, petId, message) : { text: "", used: [] };

    // Ensure a thread (owner-scoped). Create one on first message.
    if (!threadId) {
      const { data: t } = await ctx.svc
        .from("ai_chat_threads")
        .insert({ owner_id: ctx.caller.userId, pet_id: petId, title: message.slice(0, 60) })
        .select("id")
        .maybeSingle();
      threadId = t?.id ?? null;
    }
    if (threadId) {
      await ctx.svc.from("ai_chat_messages").insert({ thread_id: threadId, role: "user", content: message });
    }

    const directive = safety.banner ? `SAFETY DIRECTIVE (lead with this): ${safety.banner}\n\n` : "";
    const contextText = ctxBlock.text ? `Pet context:\n${ctxBlock.text}\n\n` : "";

    const result = await ctx.provider.generate({
      model: MODELS.chat(),
      input: [
        { role: "system", content: [{ type: "input_text", text: CHAT_PROMPT }] },
        { role: "user", content: [{ type: "input_text", text: `${directive}${contextText}Owner says: ${message}` }] },
      ],
      jsonSchema: chatSchema,
      maxOutputTokens: 900,
      temperature: 0.4,
    });

    const parsed = (result.parsed ?? {}) as { reply?: string; suggestedVetReport?: boolean };
    let reply = (parsed.reply ?? "").trim();
    const review = reviewOutput(reply);
    if (!review.ok) reply = refusalFor(review.flags);
    // Deterministic banner always wins — prepend it so it can't be buried.
    if (safety.banner && !reply.toLowerCase().includes("emergency") && !reply.includes("426-4435")) {
      reply = `${safety.banner}\n\n${reply}`;
    }
    reply = withDisclaimer(reply);

    const generationId = await logGeneration(ctx.svc, {
      ownerId: ctx.caller.userId,
      petId,
      feature: "chat",
      model: result.model,
      provider: ctx.provider.name,
      promptVersion: PROMPT_VERSIONS.chat,
      inputRefs: { threadId, contextUsed: ctxBlock.used },
      output: { reply, suggestedVetReport: !!parsed.suggestedVetReport },
      userVisibleText: reply,
      safetyFlags: [...safety.flags, ...review.flags],
      reviewStatus: "generated",
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    });

    if (threadId) {
      await ctx.svc.from("ai_chat_messages").insert({
        thread_id: threadId,
        role: "assistant",
        content: reply,
        safety_flags: safety.flags.length ? (safety.flags as never) : null,
      });
      await ctx.svc.from("ai_chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    }

    return {
      ok: true,
      data: { reply, contextUsed: ctxBlock.used, suggestedVetReport: !!parsed.suggestedVetReport, threadId },
      safety: { routing: safety.routing, flags: safety.flags, banner: safety.banner, refused: !review.ok },
      generationId,
    };
  })
);
