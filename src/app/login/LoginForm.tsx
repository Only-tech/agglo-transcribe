'use client';

import { getSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import FloatingLabelInput from '@/app/ui/FloatingLabelInput';
import { ActionButton } from "@/app/ui/ActionButton";
import { ChevronUpIcon } from "@heroicons/react/16/solid";
import Spinner from '@/app/ui/Spinner';

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (message) {
        const timer = setTimeout(() => setMessage(""), 5000);
        return () => clearTimeout(timer);
        }
    }, [message]);

    const callbackError = searchParams.get("error");
    useEffect(() => {
        if (callbackError === "ProtectedPage") {
        setMessage("Veuillez vous connecter pour accéder à cette page.");
        }
    }, [callbackError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        });

        setLoading(false);

        if (result?.error) {
        setMessage("Email ou mot de passe incorrect.");
        setIsSuccess(false);
        } else if (result?.ok) {
        setMessage("Connexion réussie. Ravi de vous revoir, votre espace est prêt !");
        setIsSuccess(true);
        await getSession();
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
        router.push(callbackUrl);
        }
    };

    return (
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

        {message && (
            <div
            className={`fixed w-full max-w-[85%] top-36 md:top-20 left-1/2 transform -translate-x-1/2 transition-all ease-out py-2 px-4 border text-center text-base rounded-lg ${
                isSuccess
                ? "text-green-600 bg-green-100"
                : "text-red-600 bg-red-100"
            }`}
            >
            {message}
            </div>
        )}

        <ActionButton
            type="submit"
            isLoading={loading}
            variant="primary-slide"
            size="normal"
            className="w-full mt-4"
        >
            {loading ? (
            <>
                <Spinner className="w-5 h-5" />
                <span className="ml-3">Connexion</span>
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
            <Link
            href="/register"
            className="text-blue-600 dark:text-blue-400 hover:underline"
            >
            Inscrivez-vous
            </Link>
        </p>
        </form>
    );
}
