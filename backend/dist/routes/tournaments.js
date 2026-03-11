"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tournamentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const sync_1 = require("csv-parse/sync");
const XLSX = __importStar(require("xlsx"));
const prisma_1 = require("../prisma");
const admin_1 = require("../middleware/admin");
const swiss_1 = require("../services/swiss");
const elo_1 = require("../services/elo");
exports.tournamentsRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});
const CreateTournamentSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1),
    rounds: zod_1.z.number().int().positive().max(15),
});
const ParticipantsSchema = zod_1.z.object({
    players: zod_1.z.array(zod_1.z.string().trim().min(1)).min(2),
});
function normalizeNames(names) {
    return Array.from(new Map(names
        .map((n) => String(n ?? "").trim())
        .filter(Boolean)
        .map((n) => [n.toLowerCase(), n])).values());
}
function parseNamesFromUploadedFile(file) {
    const raw = file.buffer.toString("utf8").trim();
    const ext = (file.originalname.split(".").pop() ?? "").toLowerCase();
    // JSON (detect by content or extension)
    if (ext === "json" || raw.startsWith("[") || raw.startsWith("{")) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed
                .map((v) => (typeof v === "string" ? v : v?.name))
                .filter((v) => typeof v === "string");
        }
        const maybePlayers = parsed?.players ?? parsed?.participants ?? parsed?.data;
        if (Array.isArray(maybePlayers)) {
            return maybePlayers
                .map((v) => (typeof v === "string" ? v : v?.name))
                .filter((v) => typeof v === "string");
        }
        throw new Error("Invalid JSON format. Expected an array of names or {players:[...]}.");
    }
    // CSV
    if (ext === "csv") {
        try {
            const records = (0, sync_1.parse)(raw, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });
            if (records.length === 0)
                return [];
            const first = records[0];
            const nameKey = Object.keys(first).find((k) => k.toLowerCase() === "name") ?? Object.keys(first)[0];
            return records.map((r) => r[nameKey]).filter((v) => typeof v === "string");
        }
        catch {
            const rows = (0, sync_1.parse)(raw, { columns: false, skip_empty_lines: true, trim: true });
            return rows.map((r) => r[0]).filter((v) => typeof v === "string");
        }
    }
    // Excel
    if (ext === "xlsx" || ext === "xls") {
        const wb = XLSX.read(file.buffer, { type: "buffer" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName)
            return [];
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        return rows
            .slice(0)
            .map((r) => r?.[0])
            .filter((v) => typeof v === "string" || typeof v === "number")
            .map((v) => String(v));
    }
    throw new Error("Unsupported file type. Upload .json, .csv, .xlsx, or .xls");
}
const SubmitResultsSchema = zod_1.z.object({
    results: zod_1.z.array(zod_1.z.object({
        matchId: zod_1.z.number().int().positive(),
        result: zod_1.z.union([zod_1.z.literal(1), zod_1.z.literal(0), zod_1.z.literal(-1)]),
    })),
});
function canGenerateRound(args) {
    return (args.tournamentActive &&
        (args.roundsCreated === 0 || args.latestRoundLocked === true) &&
        args.roundsCreated < args.roundsTotal);
}
// Active tournament
exports.tournamentsRouter.get("/tournaments/active", async (_req, res, next) => {
    try {
        const active = await prisma_1.prisma.tournament.findFirst({
            where: { active: true },
            orderBy: { id: "desc" },
            select: { id: true, name: true, rounds: true, active: true },
        });
        res.json(active);
    }
    catch (e) {
        next(e);
    }
});
// Past tournaments
exports.tournamentsRouter.get("/tournaments", async (req, res, next) => {
    try {
        const status = String(req.query.status ?? "");
        const where = status === "past"
            ? { active: false }
            : status === "active"
                ? { active: true }
                : {};
        const tournaments = await prisma_1.prisma.tournament.findMany({
            where,
            orderBy: { id: "desc" },
            select: { id: true, name: true, rounds: true, active: true, createdAt: true },
        });
        res.json(tournaments);
    }
    catch (e) {
        next(e);
    }
});
// Create tournament
exports.tournamentsRouter.post("/tournaments", admin_1.requireAdmin, async (req, res, next) => {
    try {
        const parsed = CreateTournamentSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: parsed.error.message });
        const t = await prisma_1.prisma.tournament.create({
            data: {
                name: parsed.data.name,
                rounds: parsed.data.rounds,
            },
            select: { id: true, name: true, rounds: true, active: true },
        });
        res.status(201).json(t);
    }
    catch (e) {
        next(e);
    }
});
// Tournament detail
exports.tournamentsRouter.get("/tournaments/:id", async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.id);
        if (!Number.isFinite(tournamentId))
            return res.status(400).json({ error: "Invalid id" });
        const tournament = await prisma_1.prisma.tournament.findUnique({
            where: { id: tournamentId },
            select: { id: true, name: true, rounds: true, active: true },
        });
        if (!tournament)
            return res.status(404).json({ error: "Not found" });
        const rounds = await prisma_1.prisma.round.findMany({
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
        const participants = await prisma_1.prisma.tournamentPlayer.findMany({
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
    }
    catch (e) {
        next(e);
    }
});
// Tournament report (analytics/export)
// format=json|csv (default json)
exports.tournamentsRouter.get("/tournaments/:id/report", admin_1.requireAdmin, async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.id);
        if (!Number.isFinite(tournamentId))
            return res.status(400).json({ error: "Invalid id" });
        const format = String(req.query.format ?? "json").toLowerCase();
        const tournament = await prisma_1.prisma.tournament.findUnique({
            where: { id: tournamentId },
            select: { id: true, name: true, rounds: true, active: true, createdAt: true },
        });
        if (!tournament)
            return res.status(404).json({ error: "Not found" });
        const participants = await prisma_1.prisma.tournamentPlayer.findMany({
            where: { tournamentId },
            include: { player: { select: { id: true, name: true, rating: true } } },
            orderBy: [{ score: "desc" }, { player: { rating: "desc" } }],
        });
        const rounds = await prisma_1.prisma.round.findMany({
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
        const recordByPlayerId = new Map();
        for (const tp of participants) {
            recordByPlayerId.set(tp.playerId, { wins: 0, draws: 0, losses: 0 });
        }
        for (const r of rounds) {
            for (const m of r.matches) {
                if (m.result === null)
                    continue;
                const p1 = recordByPlayerId.get(m.p1Id);
                const p2 = recordByPlayerId.get(m.p2Id);
                if (!p1 || !p2)
                    continue;
                if (m.result === 0) {
                    p1.draws += 1;
                    p2.draws += 1;
                }
                else if (m.result === 1) {
                    p1.wins += 1;
                    p2.losses += 1;
                }
                else {
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
            const lines = rows.map((r) => [
                r.playerId,
                JSON.stringify(r.name),
                Math.round(r.rating),
                r.score,
                r.wins,
                r.draws,
                r.losses,
                r.hadBye ? 1 : 0,
            ].join(","));
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
    }
    catch (e) {
        next(e);
    }
});
// Delete completed tournament
exports.tournamentsRouter.delete("/tournaments/:id", admin_1.requireAdmin, async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.id);
        if (!Number.isFinite(tournamentId))
            return res.status(400).json({ error: "Invalid id" });
        const t = await prisma_1.prisma.tournament.findUnique({ where: { id: tournamentId }, select: { active: true } });
        if (!t)
            return res.status(404).json({ error: "Not found" });
        if (t.active)
            return res.status(400).json({ error: "Cannot delete an active tournament" });
        await prisma_1.prisma.tournament.delete({ where: { id: tournamentId } });
        res.json({ ok: true });
    }
    catch (e) {
        next(e);
    }
});
// Set participants (only before any rounds exist)
exports.tournamentsRouter.post("/tournaments/:id/participants", admin_1.requireAdmin, async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.id);
        if (!Number.isFinite(tournamentId))
            return res.status(400).json({ error: "Invalid id" });
        const parsed = ParticipantsSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: parsed.error.message });
        const t = await prisma_1.prisma.tournament.findUnique({ where: { id: tournamentId } });
        if (!t)
            return res.status(404).json({ error: "Not found" });
        if (!t.active)
            return res.status(400).json({ error: "Tournament is not active" });
        const roundsCount = await prisma_1.prisma.round.count({ where: { tournamentId } });
        if (roundsCount > 0)
            return res.status(400).json({ error: "Participants are locked after round 1" });
        const uniqueNames = Array.from(new Map(parsed.data.players.map((n) => [n.trim().toLowerCase(), n.trim()])).values());
        await prisma_1.prisma.$transaction(async (tx) => {
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
    }
    catch (e) {
        next(e);
    }
});
// Import participants from JSON/CSV/XLSX (only before any rounds exist)
// multipart/form-data: file=<upload>; query: mode=append|replace
exports.tournamentsRouter.post("/tournaments/:id/participants/import", admin_1.requireAdmin, upload.single("file"), async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.id);
        if (!Number.isFinite(tournamentId))
            return res.status(400).json({ error: "Invalid id" });
        const mode = String(req.query.mode ?? "append").toLowerCase() === "replace" ? "replace" : "append";
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: "Missing file" });
        const t = await prisma_1.prisma.tournament.findUnique({ where: { id: tournamentId } });
        if (!t)
            return res.status(404).json({ error: "Not found" });
        if (!t.active)
            return res.status(400).json({ error: "Tournament is not active" });
        const roundsCount = await prisma_1.prisma.round.count({ where: { tournamentId } });
        if (roundsCount > 0)
            return res.status(400).json({ error: "Participants are locked after round 1" });
        let names;
        try {
            names = normalizeNames(parseNamesFromUploadedFile(file));
        }
        catch (e) {
            return res.status(400).json({ error: e instanceof Error ? e.message : "Invalid file" });
        }
        if (names.length < 2)
            return res.status(400).json({ error: "Need at least 2 participants" });
        await prisma_1.prisma.$transaction(async (tx) => {
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
    }
    catch (e) {
        next(e);
    }
});
// Generate next round
exports.tournamentsRouter.post("/tournaments/:id/rounds", admin_1.requireAdmin, async (req, res, next) => {
    try {
        const tournamentId = Number(req.params.id);
        if (!Number.isFinite(tournamentId))
            return res.status(400).json({ error: "Invalid id" });
        const tournament = await prisma_1.prisma.tournament.findUnique({ where: { id: tournamentId } });
        if (!tournament)
            return res.status(404).json({ error: "Not found" });
        const rounds = await prisma_1.prisma.round.findMany({
            where: { tournamentId },
            orderBy: { roundNumber: "desc" },
            take: 1,
        });
        const latestRound = rounds[0] ?? null;
        const roundsCreated = await prisma_1.prisma.round.count({ where: { tournamentId } });
        if (!canGenerateRound({
            tournamentActive: tournament.active,
            latestRoundLocked: latestRound?.locked ?? null,
            roundsCreated,
            roundsTotal: tournament.rounds,
        })) {
            return res.status(400).json({ error: "Cannot generate round right now" });
        }
        const tps = await prisma_1.prisma.tournamentPlayer.findMany({
            where: { tournamentId },
            include: { player: true },
            orderBy: { score: "desc" },
        });
        if (tps.length < 2)
            return res.status(400).json({ error: "At least 2 players required" });
        const { pairings, byePlayer } = (0, swiss_1.swissPair)(tps.map((tp) => ({
            tournamentPlayerId: tp.id,
            playerId: tp.playerId,
            score: tp.score,
            hadBye: tp.hadBye,
            rating: tp.player.rating,
        })));
        const newRoundNumber = roundsCreated + 1;
        const round = await prisma_1.prisma.$transaction(async (tx) => {
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
    }
    catch (e) {
        next(e);
    }
});
// Submit results for a round
exports.tournamentsRouter.post("/rounds/:id/results", admin_1.requireAdmin, async (req, res, next) => {
    try {
        const roundId = Number(req.params.id);
        if (!Number.isFinite(roundId))
            return res.status(400).json({ error: "Invalid id" });
        const parsed = SubmitResultsSchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: parsed.error.message });
        const round = await prisma_1.prisma.round.findUnique({
            where: { id: roundId },
            include: {
                matches: true,
                tournament: true,
            },
        });
        if (!round)
            return res.status(404).json({ error: "Not found" });
        if (!round.tournament.active)
            return res.status(400).json({ error: "Tournament is not active" });
        if (round.locked)
            return res.status(400).json({ error: "Round already locked" });
        const matchById = new Map(round.matches.map((m) => [m.id, m]));
        await prisma_1.prisma.$transaction(async (tx) => {
            // Update match results
            for (const { matchId, result } of parsed.data.results) {
                const match = matchById.get(matchId);
                if (!match)
                    throw new Error(`Match ${matchId} not in this round`);
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
                if (m.result === null)
                    continue;
                const tp1 = await tx.tournamentPlayer.findUnique({
                    where: { tournamentId_playerId: { tournamentId: round.tournamentId, playerId: m.p1Id } },
                });
                const tp2 = await tx.tournamentPlayer.findUnique({
                    where: { tournamentId_playerId: { tournamentId: round.tournamentId, playerId: m.p2Id } },
                });
                if (!tp1 || !tp2)
                    continue;
                if (m.result === 1) {
                    await tx.tournamentPlayer.update({ where: { id: tp1.id }, data: { score: { increment: 1 } } });
                }
                else if (m.result === -1) {
                    await tx.tournamentPlayer.update({ where: { id: tp2.id }, data: { score: { increment: 1 } } });
                }
                else {
                    await tx.tournamentPlayer.update({ where: { id: tp1.id }, data: { score: { increment: 0.5 } } });
                    await tx.tournamentPlayer.update({ where: { id: tp2.id }, data: { score: { increment: 0.5 } } });
                }
            }
        });
        // If last round, finalize tournament and update ratings
        const totalRounds = round.tournament.rounds;
        const lockedRounds = await prisma_1.prisma.round.count({ where: { tournamentId: round.tournamentId, locked: true } });
        if (lockedRounds >= totalRounds) {
            await (0, elo_1.updateRatingsForTournament)(round.tournamentId);
            await prisma_1.prisma.tournament.update({
                where: { id: round.tournamentId },
                data: { active: false, activeKey: null },
            });
        }
        res.json({ ok: true });
    }
    catch (e) {
        next(e);
    }
});
