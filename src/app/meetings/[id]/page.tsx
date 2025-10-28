import { db } from "@/app/lib/db"; 
import MeetingPageClient from "./MeetingPageClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Réunion - Transcripteur",
  description: "Gestion de réunions et transcription",
};

async function getMeeting(id: string) {
    const meeting = await db.meeting.findUnique({
        where: { id },
        select: { id: true, title: true } 
    });
    return meeting;
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
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
