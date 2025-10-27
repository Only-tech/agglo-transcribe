'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Loader from "@/app/ui/Loader";
import FloatingLabelInput from '@/app/ui/FloatingLabelInput';
import { ActionButton } from "@/app/ui/ActionButton";
import { TrashIcon } from "@heroicons/react/20/solid";
import ConfirmationModal from "@/app/ui/ConfirmationModal";

type Meeting = {
  id: string;
  title: string;
  createdAt: string;
};

function usePaginatedMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchMeetings = useCallback(
        async (cursor?: string) => {
        if (loading) return;
        setLoading(true);

        const url = cursor
            ? `/api/meetings/history?cursor=${cursor}&limit=10`
            : `/api/meetings/history?limit=10`;

        try {
            const res = await fetch(url);
            if (res.ok) {
            const data = await res.json();

            setMeetings((prev) => {
                const merged = [...prev, ...data.items];
                // dédoublonnage par id
                const unique = Array.from(new Map(merged.map((m) => [m.id, m])).values());
                return unique;
            });

            setCursor(data.nextCursor);
            setHasMore(!!data.nextCursor);
            }
        } finally {
            setLoading(false);
        }
        },
        [] 
    );

    useEffect(() => {
        fetchMeetings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

  return { meetings, hasMore, cursor, fetchMeetings, loading, setMeetings };
}



export default function DashboardPage() {
    const { data: session, status } = useSession({ required: true });
    const router = useRouter();

    const [meetingId, setMeetingId] = useState("");
    const [title, setTitle] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const history = usePaginatedMeetings();


    const [isModalOpen, setIsModalOpen] = useState(false);
    const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const nativeEvent = e.nativeEvent as SubmitEvent;
        const submitter = nativeEvent.submitter as HTMLButtonElement;
        const action = submitter.value;
        setLoading(true);
        setError("");

        try {
        if (action === "join") {
            if (!meetingId) {
            setError("Veuillez entrer un ID pour rejoindre.");
            setLoading(false);
            return;
            }
            const res = await fetch(`/api/meetings/${meetingId}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
            });
            if (res.status === 404) {
            if (!title) {
                setError("Réunion introuvable. Entrez un titre pour la créer.");
                setLoading(false);
                return;
            }
            await createMeeting();
            return;
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            router.push(`/meetings/${meetingId}`);
        }

        if (action === "create") {
            if (!title) {
            setError("Veuillez entrer un titre pour créer une réunion.");
            setLoading(false);
            return;
            }
            await createMeeting();
        }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Une erreur inconnue est survenue.");
            }
        } finally {
        setLoading(false);
        }
    };

    const createMeeting = async () => {
        const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        router.push(`/meetings/${data.id}`);
    };

    const confirmDelete = async () => {
        if (!meetingToDelete) return;
        try {
        await fetch(`/api/meetings/${meetingToDelete}`, { method: "DELETE" });
        history.setMeetings((prev) => prev.filter((m) => m.id !== meetingToDelete));
        } catch (err: unknown) {
            console.error("Erreur suppression réunion:", err);
        } finally {
        setIsModalOpen(false);
        setMeetingToDelete(null);
        }
    };

    if (status === "loading") {
        return (
        <div className="text-center p-10">
            <p>Chargement de la session</p>
            <Loader variant="dots" />
        </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white/90 col-span-2 md:col-span-3 lg:col-span-4 bg-white dark:bg-[#1E1E1E] rounded-xl p-6 border border-gray-300 dark:border-white/10 translate-y-0 hover:-translate-y-1 transform transition-transform duration-700 ease relative md:shadow-lg hover:shadow-[0_12px_15px_rgb(0,0,0,0.3)] dark:shadow-[0_10px_12px_rgb(0,0,0,0.5)] dark:hover:shadow-[0_12px_15px_rgb(0,0,0,0.8)]">
                Bienvenue sur votre espace personnel ! {session?.user?.name}
            </h1>

            {/* Formulaire Créer/rejoindre */}
            <form
                onSubmit={handleSubmit}
                className="flex flex-col col-span-2 row-span-2 space-y-7 p-3 sm:p-6 rounded-xl w-full h-100 sm:h-96 max-w-3xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 translate-y-0 hover:-translate-y-1 transform transition-transform duration-700 ease relative md:shadow-lg hover:shadow-[0_12px_15px_rgb(0,0,0,0.3)] dark:shadow-[0_10px_12px_rgb(0,0,0,0.5)] dark:hover:shadow-[0_12px_15px_rgb(0,0,0,0.8)]"
            >
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white/90 text-center mb-4">
                    Créez ou rejoignez une réunion
                </h2>

                <FloatingLabelInput
                    id="meeting-id"
                    label="ID de réunion (vide pour créer)"
                    type="text"
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                />
                <FloatingLabelInput
                    id="title"
                    label="Titre de la réunion"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <FloatingLabelInput
                    id="password"
                    label="Mot de passe"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div
                    className={`flex gap-3  pt-3 border-t border-gray-300 dark:border-white/10 transition-all duration-500 ease-out ${
                        meetingId.trim() !== "" || title.trim() !== ""
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-4 pointer-events-none"
                    }`}
                >
                    {meetingId.trim() !== "" && (
                        <ActionButton
                            type="submit"
                            name="action"
                            value="join"
                            variant="secondary-slide"
                            size="normal"
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? "Chargement..." : "Rejoindre"}
                        </ActionButton>
                    )}

                    {title.trim() !== "" && (
                        <ActionButton
                            type="submit"
                            name="action"
                            value="create"
                            variant="primary-slide"
                            size="normal"
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? "Chargement..." : "Lancer"}
                        </ActionButton>
                    )}
                </div>

            </form>

            {/* Réunions */}
            <section className="col-span-2 row-span-2 p-2 pl-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 translate-y-0 hover:-translate-y-1 transform transition-transform duration-700 ease relative md:shadow-lg hover:shadow-[0_12px_15px_rgb(0,0,0,0.3)] dark:shadow-[0_10px_12px_rgb(0,0,0,0.5)] dark:hover:shadow-[0_12px_15px_rgb(0,0,0,0.8)]">
                <h2 className="text-base md:text-lg font-medium pb-1 mb-2 text-gray-900 dark:text-white border-b-2 border-gray-300 dark:border-white/10">
                    Historique de réunions
                </h2>
                {history.meetings.length === 0 && (
                    <p className="text-gray-500">Aucune réunion créée.</p>
                )}
                <div className="h-82 overflow-y-auto">
                    {history.meetings.map((m) => (
                    <div
                        key={m.id}
                        className="flex justify-between items-center rounded-lg px-2 mb-1 border-b border-gray-300 dark:border-white/10 shadow hover:bg-black/5 dark:hover:bg-black"
                    >
                        <div>
                            <p className="font-medium text-sm mb-0.5">{m.title}</p>
                            <p className="text-xs text-gray-500">
                                Créée le {new Date(m.createdAt).toLocaleString("fr-FR")}
                            </p>
                        </div>
                        <div className="flex gap-3 pr-1">
                            <ActionButton
                                onClick={() => router.push(`/meetings/${m.id}`)}
                                variant="secondary-slide"
                                size="normal"
                                className=" !w-20 !h-8 !rounded-full text-sm"
                            >
                                Ouvrir
                            </ActionButton>
                            <ActionButton
                                onClick={() => { setMeetingToDelete(m.id); setIsModalOpen(true); }}
                                variant="icon"
                                size="small"
                                className=""
                            >
                                <TrashIcon className="size-4"/>
                            </ActionButton>
                        </div>
                    </div>
                    ))}
                </div>
            </section>

           
            <ConfirmationModal
                isOpen={isModalOpen}
                message="Voulez-vous vraiment supprimer cette réunion ? Cette action est irréversible."
                onConfirm={confirmDelete}
                onCancel={() => {
                setIsModalOpen(false);
                setMeetingToDelete(null);
                }}
            />
        </div>
    );
}

// 'use client';

// import { useSession } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import Loader from "@/app/ui/Loader";
// import FloatingLabelInput from '@/app/ui/FloatingLabelInput';
// import { ActionButton } from "@/app/ui/ActionButton";
// import { TrashIcon } from "@heroicons/react/20/solid";

// type Meeting = {
//     id: string;
//     title: string;
//     createdAt: string;
// };

// function usePaginatedMeetings(type: "created" | "joined") {
//     const [meetings, setMeetings] = useState<Meeting[]>([]);
//     const [cursor, setCursor] = useState<string | null>(null);
//     const [hasMore, setHasMore] = useState(true);
//     const [loading, setLoading] = useState(false);

//     const fetchMeetings = async (cursor?: string) => {
//         if (loading) return;

//         setLoading(true);
//         const url = cursor
//         ? `/api/meetings/history?type=${type}&cursor=${cursor}&limit=5`
//         : `/api/meetings/history?type=${type}&limit=5`;

//         const res = await fetch(url);
//         if (res.ok) {
//         const data = await res.json();
//         setMeetings((prev) => [...prev, ...data.items]);
//         setCursor(data.nextCursor);
//         setHasMore(!!data.nextCursor);
//         }
//         setLoading(false);
//     };

//     useEffect(() => {
//         fetchMeetings();
//     }, []);

//     return { meetings, hasMore, cursor, fetchMeetings, loading, setMeetings };
// }

// export default function DashboardPage() {
//     const { data: session, status } = useSession({ required: true });
//     const router = useRouter();

//     // Champs du formulaire unique
//     const [meetingId, setMeetingId] = useState("");
//     const [title, setTitle] = useState("");
//     const [password, setPassword] = useState("");

//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState("");

//     const created = usePaginatedMeetings("created");
//     const joined = usePaginatedMeetings("joined");

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         const action = (e.nativeEvent as any).submitter.value;
//         setLoading(true);
//         setError("");

//         try {
//         if (action === "join") {
//             if (!meetingId) {
//             setError("Veuillez entrer un ID pour rejoindre.");
//             setLoading(false);
//             return;
//             }
//             const res = await fetch(`/api/meetings/${meetingId}/join`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ password }),
//             });
//             if (res.status === 404) {
//             if (!title) {
//                 setError("Réunion introuvable. Entrez un titre pour la créer.");
//                 setLoading(false);
//                 return;
//             }
//             await createMeeting();
//             return;
//             }
//             const data = await res.json();
//             if (!res.ok) throw new Error(data.error);
//             router.push(`/meetings/${meetingId}`);
//         }

//         if (action === "create") {
//             if (!title) {
//             setError("Veuillez entrer un titre pour créer une réunion.");
//             setLoading(false);
//             return;
//             }
//             await createMeeting();
//         }
//         } catch (err: any) {
//         setError(err.message);
//         } finally {
//         setLoading(false);
//         }
//     };

//     const createMeeting = async () => {
//         const res = await fetch("/api/meetings", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ title, password }),
//         });
//         const data = await res.json();
//         if (!res.ok) throw new Error(data.error);
//         router.push(`/meetings/${data.id}`);
//     };

//     const handleDelete = async (id: string) => {
//         try {
//         await fetch(`/api/meetings/${id}`, { method: "DELETE" });
//         created.setMeetings((prev) => prev.filter((m) => m.id !== id));
//         } catch (err) {
//         console.error("Erreur suppression réunion:", err);
//         }
//     };

//     if (status === "loading") {
//         return (
//         <div className="text-center p-10">
//             <p>Chargement de la session</p>
//             <Loader variant="dots" />
//         </div>
//         );
//     }

//     return (
//         <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
//             <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white/90 col-span-2 md:col-span-3 lg:col-span-4 bg-white dark:bg-[#1E1E1E] rounded-xl p-6 border border-gray-300 dark:border-white/10 translate-y-0 hover:-translate-y-1 transform transition-transform duration-700 ease relative md:shadow-lg hover:shadow-[0_12px_15px_rgb(0,0,0,0.3)] dark:shadow-[0_10px_12px_rgb(0,0,0,0.5)] dark:hover:shadow-[0_12px_15px_rgb(0,0,0,0.8)]">
//                 Bienvenue sur votre espace personnel ! {session?.user?.name}
//             </h1>

//             {/* Formulaire unique */}
//             <form
//                 onSubmit={handleSubmit}
//                 className="flex flex-col col-span-2 row-span-2 space-y-7 p-3 sm:p-6 rounded-xl w-full h-100 sm:h-96 max-w-3xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 translate-y-0 hover:-translate-y-1 transform transition-transform duration-700 ease relative md:shadow-lg hover:shadow-[0_12px_15px_rgb(0,0,0,0.3)] dark:shadow-[0_10px_12px_rgb(0,0,0,0.5)] dark:hover:shadow-[0_12px_15px_rgb(0,0,0,0.8)]"
//             >
//                 <h2 className="text-2xl font-semibold text-gray-900 dark:text-white/90 text-center mb-4">
//                     Créez ou rejoignez une réunion
//                 </h2>

//                 <FloatingLabelInput
//                     id="meeting-id"
//                     label="ID de réunion (vide pour créer)"
//                     type="text"
//                     value={meetingId}
//                     onChange={(e) => setMeetingId(e.target.value)}
//                 />
//                 <FloatingLabelInput
//                     id="title"
//                     label="Titre de la réunion"
//                     type="text"
//                     value={title}
//                     onChange={(e) => setTitle(e.target.value)}
//                 />
//                 <FloatingLabelInput
//                     id="password"
//                     label="Mot de passe"
//                     type="password"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     required
//                 />

//                 {error && <p className="text-red-500 text-sm">{error}</p>}

//                 <div
//                     className={`flex gap-3  pt-3 border-t border-gray-300 dark:border-white/10 transition-all duration-500 ease-out ${
//                         meetingId.trim() !== "" || title.trim() !== ""
//                         ? "opacity-100 translate-y-0"
//                         : "opacity-0 -translate-y-4 pointer-events-none"
//                     }`}
//                 >
//                     {meetingId.trim() !== "" && (
//                         <ActionButton
//                             type="submit"
//                             name="action"
//                             value="join"
//                             variant="secondary-slide"
//                             size="normal"
//                             disabled={loading}
//                             className="w-full"
//                         >
//                             {loading ? "Chargement..." : "Rejoindre"}
//                         </ActionButton>
//                     )}

//                     {title.trim() !== "" && (
//                         <ActionButton
//                             type="submit"
//                             name="action"
//                             value="create"
//                             variant="primary-slide"
//                             size="normal"
//                             disabled={loading}
//                             className="w-full"
//                         >
//                             {loading ? "Chargement..." : "Lancer"}
//                         </ActionButton>
//                     )}
//                 </div>

//             </form>

//                 {/* Réunions créées */}
//                 <section className="col-span-2 row-span-1 p-2 pl-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 translate-y-0 hover:-translate-y-1 transform transition-transform duration-700 ease relative md:shadow-lg hover:shadow-[0_12px_15px_rgb(0,0,0,0.3)] dark:shadow-[0_10px_12px_rgb(0,0,0,0.5)] dark:hover:shadow-[0_12px_15px_rgb(0,0,0,0.8)]">
//                     <h2 className="text-base md:text-lg font-medium mb-1 text-gray-900 dark:text-white border-b-2 border-gray-300 dark:border-white/10">
//                         Réunions créées
//                     </h2>
//                     {created.meetings.length === 0 && (
//                         <p className="text-gray-500">Aucune réunion créée.</p>
//                     )}
//                     <div className="h-30 overflow-y-auto">
//                         {created.meetings.map((m) => (
//                         <div
//                             key={m.id}
//                             className="flex justify-between items-center rounded-lg px-2 mb-1 border-b border-gray-300 dark:border-white/10 shadow hover:bg-black/5 dark:hover:bg-black"
//                         >
//                             <div>
//                                 <p className="font-medium text-sm mb-0.5">{m.title}</p>
//                                 <p className="text-xs text-gray-500">
//                                     Créée le {new Date(m.createdAt).toLocaleString("fr-FR")}
//                                 </p>
//                             </div>
//                             <div className="flex gap-3 pr-1">
//                                 <ActionButton
//                                     onClick={() => router.push(`/meetings/${m.id}`)}
//                                     variant="secondary-slide"
//                                     size="normal"
//                                     className=" !w-20 !h-8 !rounded-full text-sm"
//                                 >
//                                     Ouvrir
//                                 </ActionButton>
//                                 <ActionButton
//                                     onClick={() => handleDelete(m.id)}
//                                     variant="icon"
//                                     size="small"
//                                     className=""
//                                 >
//                                     <TrashIcon className="size-4"/>
//                                 </ActionButton>
//                             </div>
//                         </div>
//                         ))}
//                     </div>
//                 </section>

//                 {/* Réunions rejointes */}
//                 <section className="col-span-2 row-span-1 p-2 pl-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 translate-y-0 hover:-translate-y-1 transform transition-transform duration-700 ease relative md:shadow-lg hover:shadow-[0_12px_15px_rgb(0,0,0,0.3)] dark:shadow-[0_10px_12px_rgb(0,0,0,0.5)] dark:hover:shadow-[0_12px_15px_rgb(0,0,0,0.8)]">
//                     <h2 className="text-base md:text-lg font-medium mb-1 text-gray-900 dark:text-white border-b-2 border-gray-300 dark:border-white/10">
//                         Réunions rejointes
//                     </h2>
//                     {joined.meetings.length === 0 && (
//                         <p className="text-gray-500">Aucune réunion rejointe.</p>
//                     )}
//                     <div className="h-30 overflow-y-auto">
//                         {joined.meetings.map((m) => (
//                         <div
//                             key={m.id}
//                             className="flex justify-between items-center rounded-lg px-2 mb-1 border-b border-gray-300 dark:border-white/10 shadow hover:bg-black/5 dark:hover:bg-black"
//                         >
//                             <div>
//                             <p className="font-medium text-sm mb-0.5">{m.title}</p>
//                             <p className="text-sm text-gray-500">
//                                 Créée le {new Date(m.createdAt).toLocaleString("fr-FR")}
//                             </p>
//                             </div>
//                             <ActionButton
//                             onClick={() => router.push(`/meetings/${m.id}`)}
//                             variant="secondary-slide"
//                             size="normal"
//                             className="!w-20 !h-8 !rounded-full text-sm"
//                             >
//                             Ouvrir
//                             </ActionButton>
//                         </div>
//                         ))}
//                     </div>
//                     {joined.hasMore && (
//                         <ActionButton
//                         onClick={() => joined.fetchMeetings(joined.cursor!)}
//                         disabled={joined.loading}
//                         variant="secondary-slide"
//                         size="normal"
//                         className="mt-4 w-32 h-10"
//                         >
//                         {joined.loading ? "Chargement..." : "Voir plus"}
//                         </ActionButton>
//                     )}
//                 </section>
//         </div>
//     );
// }
