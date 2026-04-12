import type { ReactNode } from "react";

import type { Workspace } from "../types";
import { OwnerWorkspaceNav } from "./OwnerWorkspaceNav";

type WorkspaceHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  workspace: Workspace;
  onChangeWorkspace: (workspace: Workspace) => void;
  meta?: ReactNode;
  className?: string;
  navAriaLabel?: string;
};

export function WorkspaceHero({
  eyebrow,
  title,
  description,
  workspace,
  onChangeWorkspace,
  meta,
  className,
  navAriaLabel,
}: WorkspaceHeroProps) {
  return (
    <header className={["workspace-hero", className].filter(Boolean).join(" ")}>
      <div className="hero-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="panel-copy workspace-hero__copy">{description}</p>
        </div>

        <OwnerWorkspaceNav
          workspace={workspace}
          onChangeWorkspace={onChangeWorkspace}
          className="workspace-nav--embedded"
          ariaLabel={navAriaLabel}
        />
      </div>

      {meta ? <div className="workspace-hero__meta">{meta}</div> : null}
    </header>
  );
}