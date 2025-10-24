'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
// import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import FloatingLabelInput from '@/app/ui/FloatingLabelInput';
import { ActionButton } from "@/app/ui/ActionButton";


export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Une erreur est survenue.");
        }

        const signInResult = await signIn("credentials", {
            redirect: false,
            email,
            password,
        });
        
        setLoading(false);

        if (signInResult?.ok) {
            router.push("/dashboard");
        } else {
            router.push("/login?message=RegistrationSuccess");
        }

        } catch (err: any) {
            setLoading(false);
            setError(err.message);
        }
    };

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
                        type={showPassword ? 'text' : 'password'}
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
                {error && <p className="fixed w-full max-w-[85%] top-36 md:top-20 left-1/2 transform -translate-x-1/2 transition-all ease-out py-2 px-4 text-center text-base rounded-lg text-red-600 bg-red-100">{error}</p>}
         
                
                
                <ActionButton 
                    type="submit" 
                    disabled={loading}
                    variant="primary-slide"
                    size="normal"
                    className="w-full mt-4"
                >
                    {loading ? "Création..." : "S'inscrire"}
                </ActionButton>

                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Déjà un compte ? {" "}
                    <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
                        Connectez-vous
                    </Link>
                </p>
            </form>
        </>
    );
}