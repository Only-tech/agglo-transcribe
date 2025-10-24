import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Participant, Meeting } from "@prisma/client";
import { db } from "@/app/lib/db";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "created";
    const limit = parseInt(searchParams.get("limit") || "5", 10);
    const cursor = searchParams.get("cursor");
    const userId = session.user.id;

    if (type === "created") {
        const meetings = await db.meeting.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        
        const hasMore = meetings.length > limit;
        const items = hasMore ? meetings.slice(0, -1) : meetings;

        return NextResponse.json({
        items,
        nextCursor: hasMore ? items[items.length - 1].id : null,
        });
    }

    if (type === "joined") {
        const participants: (Participant & { meeting: Meeting })[] =
        await db.participant.findMany({
            where: {
            userId: userId,
            // N'inclus pas les réunions où l'utilisateur est le créateur
            meeting: {
                NOT: {
                creatorId: userId,
                },
            },
            },
            include: { meeting: true },
            orderBy: { joinedAt: "desc" },
            take: limit + 1,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });

        const hasMore = participants.length > limit;
        const items = hasMore ? participants.slice(0, -1) : participants;

        return NextResponse.json({
        items: items.map((p) => p.meeting),
        nextCursor: hasMore ? items[items.length - 1].id : null,
        });
    }

    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
}