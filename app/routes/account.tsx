import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileEntity, getIDBHandler, IndexedDBHandler } from "@/lib/indexed-db";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React from "react";
import { useLoaderData } from "react-router";

export async function clientLoader({
  params,
}: {
  params: { accountId: string };
}) {
  const dbHandler = await getIDBHandler();
  const files = await dbHandler.getFilesByAccountId(params.accountId);
  return { files };
}

const Account: React.FC = () => {
  const { files } = useLoaderData<{
    files: Array<FileEntity>;
  }>();

  const columns = React.useMemo<
    ColumnDef<{ path: string; name: string; type: string; size: number }>[]
  >(
    () => [
      {
        header: "Name",
        accessorKey: "name",
      },
      {
        header: "Type",
        accessorKey: "type",
      },
      {
        header: "Size",
        accessorKey: "size",
      },
    ],
    []
  );

  const data = React.useMemo(() => files, [files]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Files in Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => {
                return (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Account;
