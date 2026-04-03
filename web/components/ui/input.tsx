import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-black/15 bg-white px-3 py-1 text-base outline-none transition focus-visible:ring-[3px] focus-visible:ring-black/10 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

