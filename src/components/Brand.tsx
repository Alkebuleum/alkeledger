interface Props {
  small?: boolean;
}

export function Brand({ small = false }: Props) {
  return (
    <div className="flex items-end gap-2.5">
      <img
        src="/logo.svg"
        alt="AlkeLedger"
        className={small ? 'h-6 w-auto pb-1' : 'h-9 w-auto pb-1.5'}
      />
      <div className="leading-tight">
        <div className={`font-display ${small ? 'text-base' : 'text-lg'} text-stone-900`}>
          <span className="font-bold">Alke</span><span className="font-light">Ledger</span>
        </div>
        {!small && (
          <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Ledger · Records · Proof
          </div>
        )}
      </div>
    </div>
  );
}
