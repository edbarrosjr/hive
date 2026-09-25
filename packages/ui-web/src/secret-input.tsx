import type * as React from "react";
import { Input } from "./components/ui/input.js";

export type SecretInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

/**
 * Masked field for API keys, tokens and other pasted secrets.
 *
 * It is a password field for masking only. The autofill hints keep password
 * managers out of it: with `new-password`, iOS covers the field with its
 * Strong Password suggestion and desktop managers offer to generate one, and
 * either way a key cannot be pasted until the manager is dismissed. Account
 * passwords keep the real hints on the auth screens.
 */
export function SecretInput(props: SecretInputProps) {
  return (
    <Input
      type="password"
      autoComplete="off"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      data-1p-ignore=""
      data-lpignore="true"
      data-bwignore=""
      {...props}
    />
  );
}
