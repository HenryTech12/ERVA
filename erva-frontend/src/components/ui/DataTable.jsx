import { useState } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'

export function DataTable({ data, columns, onRowClick, rowClassName }) {
  const [sorting, setSorting] = useState([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="overflow-x-auto rounded-lg border border-[#26314D]">
      <table className="w-full text-sm">
        <thead className="bg-[#1B2540]">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[#8891A8] font-medium cursor-pointer select-none hover:text-[#E8EAF0] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && <ChevronUpIcon className="w-3 h-3" />}
                    {header.column.getIsSorted() === 'desc' && <ChevronDownIcon className="w-3 h-3" />}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-[#26314D]">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={cn(
                'bg-[#131B2E] transition-colors',
                onRowClick && 'cursor-pointer hover:bg-[#1B2540]',
                rowClassName?.(row.original)
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-[#8891A8]">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.getRowModel().rows.length === 0 && (
        <div className="py-12 text-center text-[#8891A8] text-sm">No records found</div>
      )}
    </div>
  )
}
