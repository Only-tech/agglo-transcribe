import { db } from "@/app/lib/db"; 
import MeetingPageClient from "./MeetingPageClient";
import { notFound } from "next/navigation";

async function getMeeting(id: string) {
    const meeting = await db.meeting.findUnique({
        where: { id },
        select: { id: true, title: true } 
    });
    return meeting;
}

export default async function Page({ params }: { params: { id: string } }) {
    const { id } = params;
    const meeting = await getMeeting(id);

    if (!meeting) {
        notFound(); 
    }

    return (
        <MeetingPageClient 
            meetingId={meeting.id} 
            meetingTitle={meeting.title} 
        />
    );
}
