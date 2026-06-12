/**
 * Seed script — populates the DB with realistic stub data for local development.
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Jarvis database...");

  // ── Sample conversation ───────────────────────────────────────────────────
  const convo = await prisma.conversation.create({
    data: {
      title: "Morning check-in",
      messages: {
        create: [
          {
            role: "user",
            content: "Give me a quick morning briefing.",
          },
          {
            role: "assistant",
            content:
              "Good morning! Yesterday we processed 14 orders totalling $1,820. Ad spend was $142 with a 4.2x ROAS. You have 3 open support tickets — I'll flag the urgent one. Want me to pull the full briefing?",
          },
        ],
      },
    },
  });
  console.log(`  ✓ Conversation: ${convo.id}`);

  // ── Sample proposed actions ───────────────────────────────────────────────
  const actions = await prisma.proposedAction.createMany({
    data: [
      {
        agent: "support",
        type: "SEND_REPLY",
        summary: "Reply to John Smith re: certificate not received",
        payload: JSON.stringify({
          messageId: "msg_001",
          to: "john.smith@example.com",
          subject: "Re: Certificate not received",
          body: "Hi John, I've located your certificate and am resending it now. You should receive it within the hour. Apologies for the delay!",
        }),
        status: "pending",
      },
      {
        agent: "ads",
        type: "CHANGE_BUDGET",
        summary: "Increase daily budget on 'Forklift Spring Push' ad set from $50 to $75",
        payload: JSON.stringify({
          platform: "facebook",
          adSetId: "adset_1234",
          adSetName: "Forklift Spring Push",
          currentBudget: 50,
          proposedBudget: 75,
          reason: "ROAS has been 5.1x for the past 3 days — headroom to scale.",
        }),
        status: "pending",
      },
      {
        agent: "support",
        type: "SEND_REPLY",
        summary: "Reply to Sarah Jones re: discount code not working",
        payload: JSON.stringify({
          messageId: "msg_002",
          to: "sarah.jones@example.com",
          subject: "Re: Discount code SAVE20 not working",
          body: "Hi Sarah, the code SAVE20 is valid for new customers only. I've applied a one-time 15% discount directly to your account instead.",
        }),
        status: "approved",
      },
      {
        agent: "ads",
        type: "PAUSE_CREATIVE",
        summary: "Pause underperforming creative 'Generic Warehouse V2'",
        payload: JSON.stringify({
          platform: "facebook",
          creativeId: "creative_789",
          creativeName: "Generic Warehouse V2",
          ctr: 0.4,
          roas: 1.1,
          reason: "CTR 0.4% and ROAS 1.1x over last 7 days — below break-even.",
        }),
        status: "rejected",
        notes: "Will revisit after A/B test on new copy is done.",
      },
    ],
  });
  console.log(`  ✓ ProposedActions: ${actions.count} records`);

  // ── Daily briefing cache ──────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  await prisma.dailyBriefing.upsert({
    where: { date: today },
    create: {
      date: today,
      content: JSON.stringify({
        revenue7d: 11240,
        orders7d: 87,
        yesterdayRevenue: 1820,
        yesterdayOrders: 14,
        adSpendYesterday: 142,
        roasYesterday: 4.2,
        bestCreative: { name: "Safety First - Forklift", roas: 6.8 },
        worstCreative: { name: "Generic Warehouse V2", roas: 1.1 },
        openSupportCount: 3,
        topRecommendation:
          "Scale 'Safety First - Forklift' creative — ROAS 6.8x over 5 days with $320 spend. Consider +$30/day budget increase.",
      }),
    },
    update: {},
  });
  console.log(`  ✓ DailyBriefing for ${today}`);

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
