interface Props {
  online: boolean;
}

export default function StatusDot({ online }: Props) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={`relative w-2 h-2 rounded-full ${online ? 'bg-gray-500' : 'bg-gray-500'}`}>
        {online && (
          <span className="absolute inset-0 rounded-full bg-gray-900 animate-ping opacity-40" />
        )}
      </span>
      <span className={online ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400'}>
        {online ? '已连接' : '离线'}
      </span>
    </span>
  );
}
