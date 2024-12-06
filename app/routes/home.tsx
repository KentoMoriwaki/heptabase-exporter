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
import { HBData } from "@/lib/hb-types";
import { getIDBHandler, getIDBMasterHandler } from "@/lib/indexed-db";
import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useDropzone } from "react-dropzone";
import type { Route } from "./+types/home";
import { cn } from "@/lib/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function HomePage() {
  const navigate = useNavigate();

  const onDrop = async (acceptedFiles: File[]) => {
    try {
      const masterDB = await getIDBMasterHandler();

      let allDataFile: File | undefined;
      for (const file of acceptedFiles) {
        if (file.name === "All-Data.json") {
          allDataFile = file;
          break;
        }
      }
      if (!allDataFile) {
        throw new Error(
          'The directory does not contain a file named "All-Data.json".'
        );
      }
      const allData: HBData = JSON.parse(await allDataFile.text());
      const accountId = allData.ACCOUNT_ID;
      await masterDB.saveAccount(accountId);

      const accountDb = await getIDBHandler(accountId);
      const rootDirPath = allDataFile.webkitRelativePath
        .split("/")
        .slice(0, allDataFile.webkitRelativePath.startsWith("/") ? 2 : 1)
        .join("/");

      for (const file of acceptedFiles) {
        await accountDb.saveFile(
          file,
          file.webkitRelativePath.substring(rootDirPath.length)
        );
      }

      navigate(`/accounts/${accountId}`);
    } catch (err) {
      console.error("Error selecting directory:", err);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    useFsAccessApi: false,
  });
  const { onClick: onClickDropzone, ...rootProps } = getRootProps();

  return (
    <div
      {...rootProps}
      className={cn(
        "min-h-screen flex items-center",
        isDragActive && "bg-primary/10 border-2 border-dashed border-primary"
      )}
    >
      <div
        className={cn(
          "container mx-auto h-full p-4 flex justify-center items-center"
        )}
      >
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Heptabase Exporter</CardTitle>
            <CardDescription>
              Select your Heptabase export directory to begin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <input
                  {...getInputProps({
                    // @ts-expect-error
                    webkitdirectory: "true",
                  })}
                />
                <Button type="button" onClick={onClickDropzone}>
                  Select Heptabase Export Directory
                </Button>
              </div>
            </div>
          </CardContent>
          {/* <CardFooter className="flex justify-between"></CardFooter> */}
        </Card>
      </div>
    </div>
  );
}
