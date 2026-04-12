import type { Workspace } from "../types";

type OwnerWorkspaceNavProps = {
  workspace: Workspace;
  onChangeWorkspace: (workspace: Workspace) => void;
  className?: string;
  ariaLabel?: string;
};

const workspaceItems: Array<{ value: Workspace; label: string }> = [
  { value: "public", label: "Бронирования" },
  { value: "owner-event-types", label: "Типы событий" },
  { value: "owner-settings", label: "Настройки" },
];

export function OwnerWorkspaceNav({
  workspace,
  onChangeWorkspace,
  className,
  ariaLabel = "Разделы приложения",
}: OwnerWorkspaceNavProps) {
  return (
    <nav
      className={["workspace-nav", className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
    >
      {workspaceItems.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`workspace-nav__link${workspace === item.value ? " workspace-nav__link--active" : ""}`}
          aria-pressed={workspace === item.value}
          onClick={() => onChangeWorkspace(item.value)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
