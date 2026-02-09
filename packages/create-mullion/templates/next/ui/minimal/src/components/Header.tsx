'use client';

interface HeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
}

export function Header({title, subtitle, badge}: HeaderProps) {
  return (
    <header className="stack-sm text-center">
      <h1 className="m-0">{title}</h1>
      {subtitle ? <p className="text-muted m-0">{subtitle}</p> : null}
      {badge ? <span className="badge badge-info">{badge}</span> : null}
    </header>
  );
}
