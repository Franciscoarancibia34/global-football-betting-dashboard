import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { bookmakers, fixtures, leagues, markets, teams } from "../app/lib/providers/mock-data";
import { impliedProbability, normalizeByOverround } from "../app/lib/analytics/betting";

const prisma = new PrismaClient();

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@football-intel.local" },
    update: {},
    create: {
      email: "demo@football-intel.local",
      name: "Demo Analyst",
      passwordHash: await hash("demo1234", 10),
      bankroll: 1250.35,
      dailyStakeLimit: 150,
      maxBetStake: 35
    }
  });

  for (const bookmaker of bookmakers) {
    await prisma.bookmaker.upsert({
      where: { name: bookmaker.name },
      update: bookmaker,
      create: bookmaker
    });
  }

  for (const league of leagues) {
    await prisma.league.upsert({
      where: { id: league.id },
      update: league,
      create: league
    });
  }

  for (const [leagueIndex, leagueTeams] of teams.entries()) {
    for (const teamName of leagueTeams) {
      await prisma.team.upsert({
        where: { name_leagueId: { name: teamName, leagueId: leagues[leagueIndex].id } },
        update: {},
        create: {
          name: teamName,
          country: leagues[leagueIndex].country,
          leagueId: leagues[leagueIndex].id
        }
      });
    }
  }

  for (const market of markets) {
    await prisma.market.upsert({
      where: { code: market.code },
      update: { name: market.name },
      create: { id: market.id, code: market.code, name: market.name }
    });
  }

  for (const [index, [leagueId, homeName, awayName, offsetMinutes, status, minute]] of fixtures.entries()) {
    const homeTeam = await prisma.team.findFirstOrThrow({ where: { name: homeName, leagueId } });
    const awayTeam = await prisma.team.findFirstOrThrow({ where: { name: awayName, leagueId } });
    await prisma.match.upsert({
      where: { id: `match-${index + 1}` },
      update: {
        kickoffTime: new Date(Date.now() + Number(offsetMinutes) * 60_000),
        status,
        minute: minute ?? undefined
      },
      create: {
        id: `match-${index + 1}`,
        leagueId,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoffTime: new Date(Date.now() + Number(offsetMinutes) * 60_000),
        status,
        minute: minute ?? undefined
      }
    });
  }

  const dbBookmakers = await prisma.bookmaker.findMany();
  const dbMarkets = await prisma.market.findMany();
  const dbMatches = await prisma.match.findMany();

  for (const match of dbMatches) {
    for (const market of dbMarkets) {
      const selections = markets.find((item) => item.code === market.code)?.selections ?? ["Home", "Draw", "Away"];
      const implied = normalizeByOverround(selections.map((_, index) => 0.28 + index * 0.06));
      for (const [selectionIndex, selection] of selections.entries()) {
        await prisma.modelProbability.create({
          data: {
            matchId: match.id,
            marketId: market.id,
            selection,
            probability: implied[selectionIndex],
            modelName: "baseline-form-market",
            version: "0.1.0"
          }
        });
        for (const bookmaker of dbBookmakers) {
          const odds = Number((1.65 + ((match.id.charCodeAt(6) + selectionIndex * 7 + bookmaker.name.length) % 160) / 100).toFixed(2));
          await prisma.oddsSnapshot.create({
            data: {
              matchId: match.id,
              marketId: market.id,
              bookmakerId: bookmaker.id,
              selection,
              decimalOdds: odds,
              openingDecimalOdds: Number((odds * 0.98).toFixed(2)),
              impliedProbability: impliedProbability(odds),
              normalizedProbability: implied[selectionIndex],
              overround: 1.06
            }
          });
        }
      }
    }
  }

  const firstMatch = dbMatches[0];
  const firstMarket = dbMarkets[0];
  const firstBookmaker = dbBookmakers[0];
  await prisma.bet.create({
    data: {
      userId: demoUser.id,
      matchId: firstMatch.id,
      marketId: firstMarket.id,
      bookmakerId: firstBookmaker.id,
      selection: "Home",
      decimalOdds: 2.15,
      stake: 20,
      status: "OPEN",
      strategy: "Value baseline",
      notes: "Seed demo bet"
    }
  });

  await prisma.bankrollEvent.createMany({
    data: [
      { userId: demoUser.id, amount: 1000, type: "DEPOSIT", note: "Initial bankroll" },
      { userId: demoUser.id, amount: 250.35, type: "PROFIT", note: "Historical demo PnL" }
    ]
  });

  await prisma.alert.createMany({
    data: [
      {
        userId: demoUser.id,
        type: "VALUE_BET",
        severity: "WARNING",
        title: "EV sobre umbral",
        message: "Pinnacle muestra una ventaja simulada de 9.4% en Match Winner."
      },
      {
        userId: demoUser.id,
        type: "RESPONSIBLE_GAMING",
        severity: "INFO",
        title: "Limite diario configurado",
        message: "Tu exposicion diaria esta limitada a 150 USDC."
      }
    ]
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
