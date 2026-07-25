interface Props {
  online: boolean;
}

export default function StatusDot({ online }: Props) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={`relative w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`}>
        {online && (
          <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-40" />
        )}
      </span>
      <span className={online ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>
        {online ? '已连接' : '离线'}
      </span>
    </span>
  );
}
