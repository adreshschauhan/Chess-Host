import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { parse as csvParse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/admin";
import { swissPair } from "../services/swiss";
import { updateRatingsForTournament } from "../services/elo";

export const tournamentsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const CreateTournamentSchema = z.object({
  name: z.string().trim().min(1),
  rounds: z.number().int().positive().max(15),
});

const ParticipantsSchema = z.object({
  players: z.array(z.string().trim().min(1)).min(2),
});

function normalizeNames(names: string[]) {
  return Array.from(
    new Map(
      names
        .map((n) => String(n ?? "").trim())
        .filter(Boolean)
        .map((n) => [n.toLowerCase(), n]),
    ).values(),
  );
}

function parseNamesFromUploadedFile(file: Express.Multer.File): string[] {
  const raw = file.buffer.toString("utf8").trim();
  const ext = (file.originalname.split(".").pop() ?? "").toLowerCase();

  // JSON (detect by content or extension)
  if (ext === "json" || raw.startsWith("[") || raw.startsWith("{")) {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((v) => (typeof v === "string" ? v : (v as any)?.name)).filter((v): v is string => typeof v === "string");
    }

    const maybePlayers = (parsed as any)?.players ?? (parsed as any)?.participants ?? (parsed as any)?.data;
    if (Array.isArray(maybePlayers)) {
      return maybePlayers.map((v: any) => (typeof v === "string" ? v : v?.name)).filter((v: any): v is string => typeof v === "string");
    }

    throw new Error("Invalid JSON format. Expected an array of names or {players:[...]}.");
  }

  // CSV
  if (ext === "csv") {
    try {
      const records = csvParse(raw, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Array<Record<string, string>>;
      if (records.length === 0) return [];
      const first = records[0];
      const nameKey = Object.keys(first).find((k) => k.toLowerCase() === "name") ?? Object.keys(first)[0];
      return records.map((r) => r[nameKey]).filter((v): v is string => typeof v === "string");
    } catch {
      const rows = csvParse(raw, { columns: false, skip_empty_lines: true, trim: true }) as string[][];
      return rows.map((r) => r[0]).filter((v): v is string => typeof v === "string");
    }
  }

  // Excel
  if (ext === "xlsx" || ext === "xls") {
    const wb = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" }) as any[][];
    return rows
      .slice(0)
      .map((r) => r?.[0])
      .filter((v) => typeof v === "string" || typeof v === "number")
      .map((v) => String(v));
  }

  throw new Error("Unsupported file type. Upload .json, .csv, .xlsx, or .xls");
}

const SubmitResultsSchema = z.object({
  results: z.array(
    z.object({
      matchId: z.number().int().positive(),
      result: z.union([z.literal(1), z.literal(0), z.literal(-1)]),
    }),
  ),
});

function canGenerateRound(args: { tournamentActive: boolean; latestRoundLocked: boolean | null; roundsCreated: number; roundsTotal: number }) {
  return args.tournamentActive && (args.roundsCreated === 0 || args.latestRoundLocked === true) && args.roundsCreated < args.roundsTotal;
}

// Active tournament

tournamentsRouter.get("/tournaments/active", async (_req, res, next) => {
  try {
    const active = await prisma.tournament.findFirst({
      where: { active: true },
      orderBy: { id: "desc" },
      select: { id: true, name: true, rounds: true, active: true },
    });
    res.json(active);
  } catch (e) {
    next(e);
  }
});

// Past tournaments

tournamentsRouter.get("/tournaments", async (req, res, next) => {
  try {
    const status = String(req.query.status ?? "");
    const where = status === "past" ? { active: false } : status === "active" ? { active: true } : {};
    const take = status === "past" ? 10 : undefined;

    const tournaments = await prisma.tournament.findMany({
      where,
      orderBy: { id: "desc" },
      take,
      select: { id: true, name: true, rounds: true, active: true, createdAt: true },
    });

    res.json(tournaments);
  } catch (e) {
    next(e);
  }
});

// Create tournament

tournamentsRouter.post("/tournaments", requireAdmin, async (req, res, next) => {
  try {
    const parsed = CreateTournamentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const t = await prisma.tournament.create({
      data: {
        name: parsed.data.name,
        rounds: parsed.data.rounds,
      },
      select: { id: true, name: true, rounds: true, active: true },
    });

    res.status(201).json(t);
  } catch (e) {
    next(e);
  }
});

// Tournament detail

tournamentsRouter.get("/tournaments/:id", async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isFinite(tournamentId)) return res.status(400).json({ error: "Invalid id" });

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, name: true, rounds: true, active: true },
    });

    if (!tournament) return res.status(404).json({ error: "Not found" });

    const rounds = await prisma.round.findMany({
      where: { tournamentId },
      orderBy: { roundNumber: "desc" },
      include: {
        matches: {
          include: {
            p1: { select: { id: true, name: true } },
            p2: { select: { id: true, name: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    const participants = await prisma.tournamentPlayer.findMany({
      where: { tournamentId },
      orderBy: { score: "desc" },
      include: {
        player: { select: { id: true, name: true, rating: true } },
      },
    });

    const latestRound = rounds[0] ?? null;

    res.json({
      tournament,
      canGenerateRound: canGenerateRound({
        tournamentActive: tournament.active,
        latestRoundLocked: latestRound?.locked ?? null,
        roundsCreated: rounds.length,
        roundsTotal: tournament.rounds,
      }),
      participants: participants.map((tp) => ({
        id: tp.id,
        playerId: tp.playerId,
        name: tp.player.name,
        rating: tp.player.rating,
        score: tp.score,
        hadBye: tp.hadBye,
      })),
      rounds: rounds.map((r) => ({
        id: r.id,
        roundNumber: r.roundNumber,
        locked: r.locked,
        matches: r.matches.map((m) => ({
          id: m.id,
          p1: m.p1,
          p2: m.p2,
          result: m.result,
        })),
      })),
    });
  } catch (e) {
    next(e);
  }
});

// Tournament report (analytics/export)
// format=json|csv (default json)

tournamentsRouter.get("/tournaments/:id/report", requireAdmin, async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isFinite(tournamentId)) return res.status(400).json({ error: "Invalid id" });

    const format = String(req.query.format ?? "json").toLowerCase();

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, name: true, rounds: true, active: true, createdAt: true },
    });
    if (!tournament) return res.status(404).json({ error: "Not found" });

    const participants = await prisma.tournamentPlayer.findMany({
      where: { tournamentId },
      include: { player: { select: { id: true, name: true, rating: true } } },
      orderBy: [{ score: "desc" }, { player: { rating: "desc" } }],
    });

    const rounds = await prisma.round.findMany({
      where: { tournamentId },
      orderBy: { roundNumber: "asc" },
      include: {
        matches: {
          include: {
            p1: { select: { id: true, name: true } },
            p2: { select: { id: true, name: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    const recordByPlayerId = new Map<number, { wins: number; draws: number; losses: number }>();
    for (const tp of participants) {
      recordByPlayerId.set(tp.playerId, { wins: 0, draws: 0, losses: 0 });
    }

    for (const r of rounds) {
      for (const m of r.matches) {
        if (m.result === null) continue;
        const p1 = recordByPlayerId.get(m.p1Id);
        const p2 = recordByPlayerId.get(m.p2Id);
        if (!p1 || !p2) continue;

        if (m.result === 0) {
          p1.draws += 1;
          p2.draws += 1;
        } else if (m.result === 1) {
          p1.wins += 1;
          p2.losses += 1;
        } else {
          p1.losses += 1;
          p2.wins += 1;
        }
      }
    }

    const rows = participants.map((tp) => {
      const rec = recordByPlayerId.get(tp.playerId) ?? { wins: 0, draws: 0, losses: 0 };
      return {
        playerId: tp.playerId,
        name: tp.player.name,
        rating: tp.player.rating,
        score: tp.score,
        wins: rec.wins,
        draws: rec.draws,
        losses: rec.losses,
        hadBye: tp.hadBye,
      };
    });

    if (format === "csv") {
      const header = ["playerId", "name", "rating", "score", "wins", "draws", "losses", "hadBye"].join(",");
      const lines = rows.map((r) =>
        [r.playerId, JSON.stringify(r.name), Math.round(r.rating), r.score, r.wins, r.draws, r.losses, r.hadBye ? 1 : 0].join(","),
      );
      const csv = [header, ...lines].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="tournament-${tournamentId}-report.csv"`);
      return res.send(csv);
    }

    res.json({
      tournament,
      participants: rows,
      rounds: rounds.map((r) => ({
        id: r.id,
        roundNumber: r.roundNumber,
        locked: r.locked,
        matches: r.matches.map((m) => ({
          id: m.id,
          p1: m.p1,
          p2: m.p2,
          result: m.result,
        })),
      })),
    });
  } catch (e) {
    next(e);
  }
});

// Delete completed tournament

tournamentsRouter.delete("/tournaments/:id", requireAdmin, async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isFinite(tournamentId)) return res.status(400).json({ error: "Invalid id" });

    const t = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { active: true } });
    if (!t) return res.status(404).json({ error: "Not found" });
    if (t.active) return res.status(400).json({ error: "Cannot delete an active tournament" });

    await prisma.tournament.delete({ where: { id: tournamentId } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Set participants (only before any rounds exist)

tournamentsRouter.post("/tournaments/:id/participants", requireAdmin, async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isFinite(tournamentId)) return res.status(400).json({ error: "Invalid id" });

    const parsed = ParticipantsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) return res.status(404).json({ error: "Not found" });
    if (!t.active) return res.status(400).json({ error: "Tournament is not active" });

    const roundsCount = await prisma.round.count({ where: { tournamentId } });
    if (roundsCount > 0) return res.status(400).json({ error: "Participants are locked after round 1" });

    const uniqueNames = Array.from(new Map(parsed.data.players.map((n) => [n.trim().toLowerCase(), n.trim()])).values());

    await prisma.$transaction(async (tx) => {
      await tx.tournamentPlayer.deleteMany({ where: { tournamentId } });

      for (const name of uniqueNames) {
        const player = await tx.player.upsert({
          where: { name },
          create: { name },
          update: {},
          select: { id: true },
        });

        await tx.tournamentPlayer.create({
          data: {
            tournamentId,
            playerId: player.id,
          },
        });
      }
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Import participants from JSON/CSV/XLSX (only before any rounds exist)
// multipart/form-data: file=<upload>; query: mode=append|replace

tournamentsRouter.post("/tournaments/:id/participants/import", requireAdmin, upload.single("file"), async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isFinite(tournamentId)) return res.status(400).json({ error: "Invalid id" });

    const mode = String(req.query.mode ?? "append").toLowerCase() === "replace" ? "replace" : "append";
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Missing file" });

    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) return res.status(404).json({ error: "Not found" });
    if (!t.active) return res.status(400).json({ error: "Tournament is not active" });

    const roundsCount = await prisma.round.count({ where: { tournamentId } });
    if (roundsCount > 0) return res.status(400).json({ error: "Participants are locked after round 1" });

    let names: string[];
    try {
      names = normalizeNames(parseNamesFromUploadedFile(file));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : "Invalid file" });
    }

    if (names.length < 2) return res.status(400).json({ error: "Need at least 2 participants" });

    await prisma.$transaction(async (tx) => {
      if (mode === "replace") {
        await tx.tournamentPlayer.deleteMany({ where: { tournamentId } });
      }

      for (const name of names) {
        const player = await tx.player.upsert({
          where: { name },
          create: { name },
          update: {},
          select: { id: true },
        });

        await tx.tournamentPlayer.upsert({
          where: { tournamentId_playerId: { tournamentId, playerId: player.id } },
          create: { tournamentId, playerId: player.id },
          update: {},
        });
      }
    });

    res.json({ ok: true, count: names.length, mode });
  } catch (e) {
    next(e);
  }
});

// Generate next round

tournamentsRouter.post("/tournaments/:id/rounds", requireAdmin, async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isFinite(tournamentId)) return res.status(400).json({ error: "Invalid id" });

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) return res.status(404).json({ error: "Not found" });

    const rounds = await prisma.round.findMany({
      where: { tournamentId },
      orderBy: { roundNumber: "desc" },
      take: 1,
    });

    const latestRound = rounds[0] ?? null;
    const roundsCreated = await prisma.round.count({ where: { tournamentId } });

    if (
      !canGenerateRound({
        tournamentActive: tournament.active,
        latestRoundLocked: latestRound?.locked ?? null,
        roundsCreated,
        roundsTotal: tournament.rounds,
      })
    ) {
      return res.status(400).json({ error: "Cannot generate round right now" });
    }

    const tps = await prisma.tournamentPlayer.findMany({
      where: { tournamentId },
      include: { player: true },
      orderBy: { score: "desc" },
    });

    if (tps.length < 2) return res.status(400).json({ error: "At least 2 players required" });

    const { pairings, byePlayer } = swissPair(
      tps.map((tp) => ({
        tournamentPlayerId: tp.id,
        playerId: tp.playerId,
        score: tp.score,
        hadBye: tp.hadBye,
        rating: tp.player.rating,
      })),
    );

    const newRoundNumber = roundsCreated + 1;

    const round = await prisma.$transaction(async (tx) => {
      const r = await tx.round.create({
        data: {
          tournamentId,
          roundNumber: newRoundNumber,
        },
      });

      if (byePlayer) {
        await tx.tournamentPlayer.update({
          where: { id: byePlayer.tournamentPlayerId },
          data: { score: { increment: 1 }, hadBye: true },
        });
      }

      for (const [p1, p2] of pairings) {
        await tx.match.create({
          data: {
            roundId: r.id,
            p1Id: p1.playerId,
            p2Id: p2.playerId,
          },
        });
      }

      return r;
    });

    res.status(201).json({ roundId: round.id });
  } catch (e) {
    next(e);
  }
});

// Submit results for a round

tournamentsRouter.post("/rounds/:id/results", requireAdmin, async (req, res, next) => {
  try {
    const roundId = Number(req.params.id);
    if (!Number.isFinite(roundId)) return res.status(400).json({ error: "Invalid id" });

    const parsed = SubmitResultsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        matches: true,
        tournament: true,
      },
    });

    if (!round) return res.status(404).json({ error: "Not found" });
    if (!round.tournament.active) return res.status(400).json({ error: "Tournament is not active" });
    if (round.locked) return res.status(400).json({ error: "Round already locked" });

    const matchById = new Map(round.matches.map((m) => [m.id, m] as const));

    await prisma.$transaction(async (tx) => {
      // Update match results
      for (const { matchId, result } of parsed.data.results) {
        const match = matchById.get(matchId);
        if (!match) throw new Error(`Match ${matchId} not in this round`);

        await tx.match.update({
          where: { id: matchId },
          data: { result },
        });
      }

      // Lock round
      await tx.round.update({ where: { id: roundId }, data: { locked: true } });

      // Re-fetch matches with results applied
      const matches = await tx.match.findMany({ where: { roundId } });

      // Apply scores
      for (const m of matches) {
        if (m.result === null) continue;

        const tp1 = await tx.tournamentPlayer.findUnique({
          where: { tournamentId_playerId: { tournamentId: round.tournamentId, playerId: m.p1Id } },
        });
        const tp2 = await tx.tournamentPlayer.findUnique({
          where: { tournamentId_playerId: { tournamentId: round.tournamentId, playerId: m.p2Id } },
        });

        if (!tp1 || !tp2) continue;

        if (m.result === 1) {
          await tx.tournamentPlayer.update({ where: { id: tp1.id }, data: { score: { increment: 1 } } });
        } else if (m.result === -1) {
          await tx.tournamentPlayer.update({ where: { id: tp2.id }, data: { score: { increment: 1 } } });
        } else {
          await tx.tournamentPlayer.update({ where: { id: tp1.id }, data: { score: { increment: 0.5 } } });
          await tx.tournamentPlayer.update({ where: { id: tp2.id }, data: { score: { increment: 0.5 } } });
        }
      }
    });

    // If last round, finalize tournament and update ratings
    const totalRounds = round.tournament.rounds;
    const lockedRounds = await prisma.round.count({ where: { tournamentId: round.tournamentId, locked: true } });

    if (lockedRounds >= totalRounds) {
      await updateRatingsForTournament(round.tournamentId);
      await prisma.tournament.update({
        where: { id: round.tournamentId },
        data: { active: false, activeKey: null },
      });
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Manually complete (finalize) a tournament

tournamentsRouter.patch("/tournaments/:id", requireAdmin, async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isFinite(tournamentId)) return res.status(400).json({ error: "Invalid id" });

    const t = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, active: true },
    });
    if (!t) return res.status(404).json({ error: "Not found" });
    if (!t.active) return res.status(400).json({ error: "Tournament is already completed" });

    await updateRatingsForTournament(tournamentId);
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { active: false, activeKey: null },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
