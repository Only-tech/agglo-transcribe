'use client';

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation"; // Pas utilisé pour la redirection afin de garantir le rechargement
import Link from "next/link";
import FloatingLabelInput from '@/app/ui/FloatingLabelInput';
import { ActionButton } from "@/app/ui/ActionButton";
import { ChevronUpIcon } from "@heroicons/react/16/solid";
import Spinner from '@/app/ui/Spinner';

export default function LoginPage() {
    const { status } = useSession();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    // redirige si déjà connecté
    useEffect(() => {
        if (status === "authenticated" && !isSuccess) {
            window.location.href = "/dashboard";
        }
    }, [status, isSuccess]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        const result = await signIn("credentials", {
            redirect: false,
            email,
            password,
        });

        if (result?.error) {
            setLoading(false);
            setMessage("Email ou mot de passe incorrect.");
            setIsSuccess(false);
        } else if (result?.ok) {
            setIsSuccess(true);
            setMessage("Connexion réussie. Ravi de vous revoir, votre espace est prêt !");
            
            // Redirige après connexion
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 2500);
        }
    };

    // Spinner d'attente seulement si redirection automatique
    if (status === "authenticated" && !isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center mt-10 animate-pulse">
                <Spinner className="size-20 text-blue-600" />
                <p className="mt-4 text-gray-500">Accès à votre espace...</p>
            </div>
        );
    }

    return (
        <>
            <form
                onSubmit={handleSubmit}
                className="flex flex-col space-y-7 px-3 py-5 sm:p-8 rounded-xl mx-auto w-full max-w-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 shadow-xl dark:shadow-[0_12px_15px_rgb(0,0,0,0.8)]"
            >
                <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                    Connectez-vous
                </h1>
                <p className="text-gray-700 dark:text-white/90 text-center -mt-4">
                    Ravi de vous revoir, votre espace est prêt !
                </p>

                <FloatingLabelInput
                    id="email"
                    label="email@exemple.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <FloatingLabelInput
                    id="password"
                    label="Mot de passe"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />


                <ActionButton
                    type="submit"
                    isLoading={loading || isSuccess} // Garde le loading actif pendant le succès aussi
                    variant="primary-slide"
                    size="normal"
                    className="w-full mt-4"
                    disabled={loading || isSuccess}
                >
                    {loading || isSuccess ? (
                        <>
                            <Spinner className="w-5 h-5" />
                            {/* Changement de texte pour le feedback */}
                            <span className="ml-3">{isSuccess ? "Redirection..." : "Connexion..."}</span>
                        </>
                    ) : (
                        <>
                            <span>Se connecter</span>
                            <ChevronUpIcon className="inline-block size-6 ml-2 rotate-90 group-hover:animate-bounce" />
                        </>
                    )}
                </ActionButton>

                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Pas encore de compte ?{" "}
                    <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                        Inscrivez-vous
                    </Link>
                </p>
            </form>

            {/* Notification Succès ou Erreur */}
            {message && (
                <div className={`fixed max-w-[90%] w-fit top-24 left-1/2 transform -translate-x-1/2 z-50 py-3 px-4 shadow-lg rounded-lg text-center font-medium transition-all duration-300 ${
                        isSuccess ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"
                    }`}>
                    {message}
                </div>
            )}
        </>
    );
}