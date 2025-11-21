'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
// import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import FloatingLabelInput from '@/app/ui/FloatingLabelInput';
import { ActionButton } from "@/app/ui/ActionButton";
import Spinner from '@/app/ui/Spinner';
import { ChevronUpIcon } from "@heroicons/react/16/solid";


export default function RegisterPage() {
    // Récupère le statut
    const { status } = useSession();
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    // const [showPassword, setShowPassword] = useState(false);

    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    // Redirige si déjà connecté
    useEffect(() => {
        if (status === "authenticated" && !isSuccess) {
            window.location.href = "/dashboard";
        }
    }, [status, isSuccess]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        try {
            // Crée le compte via API
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Une erreur est survenue.");
            }

            // Connexion automatique après inscription
            const signInResult = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });
            
            if (signInResult?.ok) {
                setIsSuccess(true);
                setMessage("Compte créé avec succès ! Redirection...");
                
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 2500);
            } else {
                setLoading(false);
                router.push("/login?message=RegistrationSuccess");
            }

        } catch (err: unknown) {
            setLoading(false);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Une erreur inconnue est survenue.");
            }
        }
    };

    // Spinner d'attente seulement si redirection automatique
    if (status === "authenticated" && !isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center mt-10 animate-pulse">
                <Spinner className="size-20 text-blue-600" />
                <p className="mt-4 text-gray-500">Vous êtes déjà connecté...</p>
            </div>
        );
    }

    return (
        <>
            <form 
                onSubmit={handleSubmit} 
                className="flex flex-col space-y-7 px-3 py-5 sm:p-8 rounded-xl mx-auto w-full max-w-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/10 shadow-xl dark:shadow-[0_12px_15px_rgb(0,0,0,0.8)]"
            >
                <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Créez votre compte</h1>
                
                <FloatingLabelInput
                    id="name"
                    label="Votre nom"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                
                <FloatingLabelInput
                    id="email"
                    label="email@exemple.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                
                {/* <div className="relative"></div> */}
                    <FloatingLabelInput
                        id="password"
                        label="Mot de passe (8+ caractères)"
                        type="password"
                        // type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                    />
                    {/* <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-white/70 cursor-pointer"
                        aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                        title={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                    >
                        {showPassword ? (
                            <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                            <EyeIcon className="h-5 w-5" />
                        )}
                    </button>
                </div> */}         
                
                
                <ActionButton 
                    type="submit" 
                    disabled={loading || isSuccess}
                    variant="primary-slide"
                    size="normal"
                    className="w-full mt-4"
                >
                    {loading || isSuccess ? (
                        <>
                            <Spinner className="w-5 h-5" />
                            <span className="ml-3">{isSuccess ? "Redirection..." : "Création..."}</span>
                        </>
                    ) : (
                        <>
                            <span>S&apos;inscrire</span>
                            <ChevronUpIcon className="inline-block size-6 ml-2 rotate-90 group-hover:animate-bounce" />
                        </>
                    )}
                </ActionButton>

                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Déjà un compte ? {" "}
                    <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                        Connectez-vous
                    </Link>
                </p>
            </form>

            {/* Notification Succès ou Erreur */}
            {(error || message) && (
                <div
                    className={`fixed max-w-[90%] w-fit top-24 left-1/2 transform -translate-x-1/2 z-50 py-3 px-4 shadow-lg rounded-lg text-center font-medium border transition-all duration-300 ${
                        error
                            ? "bg-red-100 text-red-800 border-red-200"
                            : "bg-green-100 text-green-800 border-green-200"
                    }`}
                >
                    {error || message}
                </div>
            )}
        </>
    );
}