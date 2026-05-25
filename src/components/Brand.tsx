interface Props {
  small?: boolean;
}

export function Brand({ small = false }: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${
          small ? 'w-7 h-7' : 'w-9 h-9'
        } rounded-md bg-stone-900 text-stone-50 flex items-center justify-center font-display`}
      >
        <span className={small ? 'text-sm' : 'text-base'}>AL</span>
      </div>
      <div className="leading-tight">
        <div className={`font-display ${small ? 'text-base' : 'text-lg'} text-stone-900`}>
          AlkeLedger
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
