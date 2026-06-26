import { prisma } from "@/app/lib/server/db";

export async function getDemoUser() {
  return prisma.user.upsert({
    where: { email: "demo@football-intel.local" },
    update: {},
    create: {
      email: "demo@football-intel.local",
      name: "Demo Analyst",
      bankroll: 1250.35,
      dailyStakeLimit: 150,
      maxBetStake: 35
    }
  });
}
