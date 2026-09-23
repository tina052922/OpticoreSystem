"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import { cn } from "./utils";

function DropdownMenu(props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-xl border border-black/10 bg-white p-1.5",
          "shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)] ring-1 ring-black/[0.03]",
          // Keyframes live in globals.css (`oc-menu-in`); the origin follows the trigger's side.
          "origin-[var(--radix-dropdown-menu-content-transform-origin)] oc-menu-animate",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium",
        "text-black/80 outline-none transition-colors",
        "focus:bg-black/[0.055] focus:text-black data-[highlighted]:bg-black/[0.055] data-[highlighted]:text-black",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // Icons inherit the row's tone instead of each caller setting a colour.
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-black/55",
        className,
      )}
      {...props}
    />
  );
}

/** Non-interactive heading — account name, section titles. */
function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn("px-2.5 py-1.5 text-xs font-semibold text-black/50", className)}
      {...props}
    />
  );
}

/** Hairline between groups of items. */
function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("-mx-1.5 my-1.5 h-px bg-black/[0.08]", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
