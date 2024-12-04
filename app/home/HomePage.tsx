import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getIDBHandler, IndexedDBHandler } from "@/lib/indexed-db"; // Adjust the import path accordingly
import { HBData } from "@/lib/exported-types";

export const HomePage: React.FC = () => {
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(
    null
  );
  const navigate = useNavigate();
  const dbHandler = new IndexedDBHandler("HeptabaseDB");

  const handleDirectorySelect = async () => {
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker();
      setSelectedDirectory(dirHandle.name);

      const dbHandler = await getIDBHandler();

      let allData: HBData | undefined;

      // Check for All-Data.json in the root directory
      for await (const entry of dirHandle.values()) {
        if (entry.kind === "file" && entry.name === "All-Data.json") {
          const file = await (entry as FileSystemFileHandle).getFile();
          const content = await file.text();
          allData = JSON.parse(content);

          break;
        }
      }
      if (!allData) {
        throw new Error(
          'The directory does not contain a file named "All-Data.json".'
        );
      }
      const accountId = allData.ACCOUNT_ID;
      await dbHandler.saveAccount(accountId);

      const traverseDirectory = async (
        dirHandle: FileSystemDirectoryHandle,
        parentPath: string
      ) => {
        for await (const entry of dirHandle.values()) {
          const entryPath = `${parentPath}/${entry.name}`;
          if (entry.kind === "file") {
            const file = await (entry as FileSystemFileHandle).getFile();
            await dbHandler.saveFile(file, entryPath, accountId);
          } else if (entry.kind === "directory") {
            await traverseDirectory(
              entry as FileSystemDirectoryHandle,
              entryPath
            );
          }
        }
      };

      await traverseDirectory(dirHandle, ".");

      navigate(`/accounts/${accountId}`);
    } catch (err) {
      console.error("Error selecting directory:", err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDirectory) {
      console.log("Processing directory:", selectedDirectory);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Heptabase Exporter</CardTitle>
          <CardDescription>
            Select your Heptabase export directory to begin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Button type="button" onClick={handleDirectorySelect}>
                  Select Heptabase Export Directory
                </Button>
              </div>
              {selectedDirectory && (
                <Input id="directory" value={selectedDirectory} readOnly />
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!selectedDirectory}
          >
            Process Export
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
