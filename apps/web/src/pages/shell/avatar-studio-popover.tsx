import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { encodeClaveAvatar, parseBotAvatarValue } from "@rakazo/core";
import { darkTokens, mascotEyeColors } from "@rakazo/ui-tokens";
import {
  BotAvatar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rakazo/ui-web";
import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";

export interface AvatarStudioPopoverProps {
  value: string;
  identity?: string;
  status?: string;
  size?: number;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AvatarStudioPopover({
  value,
  identity,
  status,
  size = 72,
  onChange,
  disabled = false,
}: AvatarStudioPopoverProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseBotAvatarValue(value);
  const currentColor = parsed.kind === "clave" ? parsed.eyeColor : darkTokens.mascotEyes;

  function selectColor(color: string) {
    onChange(encodeClaveAvatar(color));
  }

  function resetAvatar() {
    onChange(encodeClaveAvatar(darkTokens.mascotEyes));
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="group relative cursor-pointer rounded-2xl outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t`Customize bot avatar`}
        data-testid="avatar-studio-trigger"
      >
        <BotAvatar color={value} identity={identity} size={size} status={status} />
        <div className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-secondary text-foreground shadow-md transition-transform group-hover:scale-110">
          <Pencil size={12} strokeWidth={2.2} />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[360px] max-w-full gap-4 rounded-3xl p-5 sm:max-w-[360px]"
          data-testid="avatar-studio"
        >
          <DialogHeader className="flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-[14px] font-semibold tracking-tight">
              <Trans>Avatar Studio</Trans>
            </DialogTitle>
            <DialogDescription className="sr-only">
              <Trans>Choose an eye color</Trans>
            </DialogDescription>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t`Close`}
            >
              <X size={16} />
            </button>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-2">
            <BotAvatar
              color={encodeClaveAvatar(currentColor)}
              identity={identity}
              size={78}
              expression="thinking"
            />
          </div>

          <div className="border-t border-border pt-3" data-testid="avatar-studio-color">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                <Trans>Eye color</Trans>
              </span>
              <button
                type="button"
                onClick={resetAvatar}
                className="px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Trans>Reset</Trans>
              </button>
            </div>
            <div className="grid grid-cols-6 place-items-center gap-2">
              {mascotEyeColors.map((color) => {
                const selected = currentColor.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => selectColor(color)}
                    aria-label={t`Eye color ${color}`}
                    aria-pressed={selected}
                    className={`size-6 rounded-full border transition-transform hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring ${
                      selected
                        ? "scale-105 border-transparent ring-2 ring-foreground ring-offset-2 ring-offset-popover"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                );
              })}
            </div>
          </div>

          <DialogFooter className="border-border sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Check size={14} />
              <Trans>Done</Trans>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
