import { theme } from '../../theme';
import { Badge } from './Badge';

export const TableGrid = ({
  columns,
  data,
  onRowClick,
  selectedId,
  emptyMessage = 'No data available'
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-left text-xs font-medium tracking-wider"
                style={{ 
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm"
                style={{ color: theme.colors.muted }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={() => onRowClick?.(row)}
                className={
                  'transition-colors cursor-pointer ' +
                  (selectedId === row.id ? 'bg-opacity-10' : 'hover:bg-opacity-5')
                }
                style={{ 
                  backgroundColor: selectedId === row.id ? theme.colors.accent : theme.colors.background,
                  borderBottom: '1px solid ' + theme.colors.muted + '20'
                }}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-3 text-sm whitespace-nowrap"
                    style={{ color: theme.colors.primary }}
                  >
                    {column.render ? (
                      column.render(row[column.key], row)
                    ) : column.type === 'status' ? (
                      <Badge
                        variant={getStatusVariant(row[column.key])}
                      >
                        {row[column.key]}
                      </Badge>
                    ) : column.type === 'currency' ? (
                      <>₱{Number(row[column.key]).toFixed(2)}</>
                    ) : (
                      row[column.key]
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const getStatusVariant = (status) => {
  const statusMap = {
    active: 'success',
    inactive: 'error',
    pending: 'warning',
    completed: 'success',
    processing: 'accent',
    cancelled: 'error',
    received: 'success',
    preparing: 'warning',
    ready: 'primary',
    delivered: 'success'
  };
  
  return statusMap[status?.toLowerCase()] || 'default';
};