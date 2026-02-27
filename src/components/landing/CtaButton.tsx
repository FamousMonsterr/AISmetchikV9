"use client";
import React from "react";
import Link from "next/link";
import { GlassButton } from "../ui/glass-button";
import { useAppContext } from "@/contexts/AppContext";

export const CtaButton = ({ href, children, variant = 'primary', size = 'lg', onClick, className }: { href: string, children: React.ReactNode, variant?: 'primary' | 'secondary' | 'danger', size?: 'sm' | 'md' | 'lg', onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void, className?: string }) => {
    const { setNavigating } = useAppContext();
    
    const commonProps = {
        variant: variant,
        size: size,
        className: className
    };

    if (onClick) {
         return (
            <GlassButton {...commonProps} onClick={onClick}>
                {children}
            </GlassButton>
        );
    }

    if (href.startsWith('/')) {
        return (
            <Link href={href} passHref>
                <GlassButton {...commonProps} onClick={() => setNavigating(true)}>
                    {children}
                </GlassButton>
            </Link>
        );
    }
    
    return (
        <a href={href} target="_blank" rel="noopener noreferrer">
             <GlassButton {...commonProps}>
                {children}
            </GlassButton>
        </a>
    );
};
