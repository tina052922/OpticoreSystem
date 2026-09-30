"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/utils";

/**
 * A password field with a reveal toggle.
 *
 * Typing a password you cannot read is how typos become failed sign-ins, and it is worse for an
 * admin setting a password *for someone else*: they have to read it back to pass it on. The toggle
 * starts hidden, so the value is never on screen unless it is asked for.
 *
 * The button is `tabIndex={-1}` deliberately. Tab should go from the password to the next field, as
 * it does on every other form; someone who wants to reveal the value reaches for the mouse.
 */
export function PasswordInput({
  className,
  containerClassName,
  buttonClassName,
  /** Reset to hidden from the parent, e.g. after a form is saved and cleared. */
  hiddenKey,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type"> & {
  containerClassName?: string;
  buttonClassName?: string;
  hiddenKey?: string | number;
}) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (hiddenKey === undefined) return;
    setVisible(false);
  }, [hiddenKey]);

  return (
    <div className={cn("relative", containerClassName)}>
      <Input
        {...props}
        type={visible ? "text" : "password"}
        // Room for the button, so a long value never runs underneath it.
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        disabled={props.disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-black/45 outline-none transition",
          "hover:bg-black/[0.05] hover:text-black/70 focus-visible:ring-2 focus-visible:ring-black/20",
          "disabled:pointer-events-none disabled:opacity-40",
          buttonClassName,
        )}
      >
        {visible ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
