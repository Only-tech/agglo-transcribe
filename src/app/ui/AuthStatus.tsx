'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Loader from "@/app/ui/Loader"; 
import { ActionButton } from '@/app/ui/ActionButton'; 
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/16/solid';
import Link from 'next/link';
import { HomeIcon } from '@heroicons/react/24/solid';

export const AuthStatus = () => {
    const { data: session, status } = useSession();
    const router = useRouter(); 

    if (status === 'loading') {
        return <div className="text-sm text-gray-500"><p>Chargement</p><Loader variant="dots" /></div>;
    }

    if (session) {
        return (
            <div className="flex items-center gap-4">
                <Link href="/dashboard"
                    title="Tableau de bord" 
                    className="text-xl font-bold text-gray-900 dark:text-white/90 hover:text-blue-800  translate-y-0 hover:translate-y-1.5 scale-100 hover:scale-102 transform transition-all ease-out duration-600"
                >
                    <HomeIcon className="size-6"/>
                </Link>
                <p className="text-sm hidden sm:block text-gray-800 dark:text-gray-200">
                    Bonjour, {session.user?.name || session.user?.email}
                </p>
                <ActionButton
                    onClick={() => signOut({ callbackUrl: '/' })}
                    variant="secondary-slide"
                    size="normal"
                    title="Se déconnecter"
                    className="!bg-[#9f0712] !h-10 !rounded-full max-sm:!w-10"
                >
                    <span className="hidden sm:flex">Déconnexion</span>
                    <ArrowRightStartOnRectangleIcon className="size-6 sm:hidden"/>
                </ActionButton>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Link href="/dashboard"
                title="Tableau de bord" 
                className="text-xl font-bold text-gray-900 dark:text-white/90 hover:text-blue-800  translate-y-0 hover:translate-y-1.5 scale-100 hover:scale-102 transform transition-all ease-out duration-600"
            >
                <HomeIcon className="size-6"/>
            </Link>
            <ActionButton
                onClick={() => router.push('/register')} 
                variant="secondary-slide"
                size="normal"
                className="rounded-l-full !h-10"
            >
                Inscription
            </ActionButton>
            <ActionButton
                onClick={() => signIn()}
                variant="primary-slide"
                size="normal"
                className="rounded-r-full !h-10"
            >
                Connexion
            </ActionButton>
        </div>
    );
};