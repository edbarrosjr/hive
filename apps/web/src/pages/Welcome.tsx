import { Trans } from "@lingui/react/macro";
import { BotAvatar } from "@rakazo/ui-web";
import { Link, useNavigate } from "react-router-dom";
import { useAuthCapabilities } from "../lib/auth-capabilities";
import { WindowChrome } from "./WindowChrome";

const ctaClass =
  "app-no-drag rounded-full bg-accent px-[34px] py-[15px] text-[19px] text-foreground transition hover:scale-[1.04] hover:bg-accent";

export function WelcomePage() {
  const navigate = useNavigate();
  const capabilities = useAuthCapabilities();
  return (
    <div className="flex min-h-full flex-col bg-background" data-rakazo-surface="welcome">
      <div className="app-drag flex gap-2 px-5 py-[18px]">
        <WindowChrome />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-11 pb-[90px]">
        <div className="flex items-center gap-[26px]">
          <BotAvatar color="" size={88} />
          <div className="text-[76px] leading-none tracking-[-0.03em] text-foreground">HIVE</div>
        </div>
        <p className="max-w-[600px] text-center text-[27px] leading-[1.4] text-foreground/75">
          <Trans>
            Your team of always-on agents
            <br />
            that you can give real work to.
          </Trans>
        </p>
        {capabilities === null ? (
          <div className="h-[57px]" aria-hidden="true" />
        ) : capabilities.signups ? (
          <>
            <button type="button" onClick={() => navigate("/sign-up")} className={ctaClass}>
              <Trans>Sign up</Trans>&nbsp;&nbsp;→
            </button>
            <p className="app-no-drag -mt-4 text-[17px] text-muted-foreground">
              <Trans>Already have an account?</Trans>{" "}
              <Link to="/sign-in" className="font-medium text-foreground">
                <Trans>Sign in</Trans>
              </Link>
            </p>
          </>
        ) : (
          <button type="button" onClick={() => navigate("/sign-in")} className={ctaClass}>
            <Trans>Sign in</Trans>&nbsp;&nbsp;→
          </button>
        )}
      </div>
    </div>
  );
}
