"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";

export const BottomGradient = () => {
  return null;
};

export const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};

export { Input, Label };
