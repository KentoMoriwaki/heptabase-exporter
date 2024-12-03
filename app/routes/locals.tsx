import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { IndexedDBHandler } from "@/lib/indexed-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Locals: React.FC = () => {
  const { directoryId } = useParams<{ directoryId: string }>();
  const [files, setFiles] = useState<
    Array<{ path: string; name: string; type: string; size: number }>
  >([]);

  useEffect(() => {
    const fetchFiles = async () => {
      const dbHandler = new IndexedDBHandler("HeptabaseDB");
      const db = await dbHandler.init();
      const files = await dbHandler.getFilesByDirectoryID(db, directoryId!);
      setFiles(files);
    };

    fetchFiles();
  }, [directoryId]);

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

export default Locals;
