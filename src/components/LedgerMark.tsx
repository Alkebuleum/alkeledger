interface Props {
  vellum?: boolean;
}

export function LedgerMark({ vellum = false }: Props) {
  const bar = vellum ? '#EFE9DC' : '#171B21';
  const accent = vellum ? '#B3453C' : '#8A1E2D';
  return (
    <svg width="24" height="24" viewBox="0 0 96 96" aria-hidden="true">
      <rect x="20" y="11.75" width="56" height="9" rx="2" fill={bar} />
      <rect x="20" y="27.25" width="26" height="9" rx="2" fill={bar} />
      <rect x="20" y="42.75" width="56" height="9" rx="2" fill={bar} />
      <rect x="50" y="58.25" width="26" height="9" rx="2" fill={bar} />
      <rect x="20" y="73.75" width="56" height="9" rx="2" fill={bar} />
      <rect x="80" y="73.75" width="5" height="9" rx="2" fill={accent} />
    </svg>
  );
}
