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
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const cursor = searchParams.get("cursor");
    const userId = session.user.id;

    const createdMeetings = await db.meeting.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: "desc" },
    });

    const participants: (Participant & { meeting: Meeting })[] =
        await db.participant.findMany({
        where: {
            userId,
            meeting: {
            NOT: { creatorId: userId },
            },
        },
        include: { meeting: true },
        orderBy: { joinedAt: "desc" },
        });

    const joinedMeetings = participants.map((p) => p.meeting);

    const allMeetingsMap = new Map<string, Meeting>();
    [...createdMeetings, ...joinedMeetings].forEach((m) => {
        allMeetingsMap.set(m.id, m);
    });

    const allMeetings = Array.from(allMeetingsMap.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    let startIndex = 0;
    if (cursor) {
        const index = allMeetings.findIndex((m) => m.id === cursor);
        if (index >= 0) startIndex = index + 1;
    }

    const paginated = allMeetings.slice(startIndex, startIndex + limit + 1);
    const hasMore = paginated.length > limit;
    const items = hasMore ? paginated.slice(0, -1) : paginated;

    return NextResponse.json({
        items,
        nextCursor: hasMore ? items[items.length - 1].id : null,
    });
}
