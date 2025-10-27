'use client';

import { Suspense } from "react";
import LoginForm from "@/app/login/LoginForm";

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="p-6 text-center">Chargement...</div>}>
            <LoginForm />
        </Suspense>
    );
}