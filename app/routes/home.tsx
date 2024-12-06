import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Zap, Brain, Shield, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router";
import { getIDBHandler, getIDBMasterHandler } from "@/lib/indexed-db";
import { HBData } from "@/lib/hb-types";
import { cn } from "@/lib/utils";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function HomePage() {
  const navigate = useNavigate();

  const onDrop = async (acceptedFiles: Array<File & { path?: string }>) => {
    try {
      const masterDB = await getIDBMasterHandler();

      let allDataFile: (typeof acceptedFiles)[0] | undefined;
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
      await accountDb.deleteFiles();

      const allDataPath = allDataFile.path || allDataFile.webkitRelativePath;
      const rootDirPath = allDataPath.slice(
        0,
        allDataPath.length - "All-Data.json".length
      );

      for (const file of acceptedFiles) {
        const path = file.path || file.webkitRelativePath;
        await accountDb.saveFile(file, path.substring(rootDirPath.length));
      }

      navigate(`/accounts/${accountId}`);
    } catch (err) {
      console.error("Error selecting directory:", err);
    }
  };

  const { getRootProps, isDragActive, getInputProps } = useDropzone({
    onDrop,
    useFsAccessApi: false,
  });
  const { onClick: onClickDropzone, ...rootProps } = getRootProps();

  return (
    <div
      {...rootProps}
      className={cn(
        "min-h-screen bg-background text-foreground flex flex-col",
        isDragActive && "bg-primary/10 border-2 border-dashed border-primary"
      )}
    >
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-center">
            Bundle My Heptabase
          </h1>
        </div>
      </header>

      <main className="flex-grow flex flex-col justify-center items-center p-4">
        <section className="text-center mb-8 max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">
            Bundle Your Heptabase Data
            <br />
            for AI Tools
          </h2>
          <p className="text-xl mb-6">
            Safely organize exported data and
            <br />
            easily use it with ChatGPT, Claude, NotebookLM, and more.
          </p>
          <p className="text-lg font-semibold text-primary">
            100% Free to Use - No Sign-up Required!
          </p>
        </section>

        <div
          className={`w-full max-w-xl p-8 border-2 border-dashed rounded-lg text-center mb-8 transition-colors ${
            isDragActive ? "border-primary bg-primary/10" : "border-muted"
          }`}
        >
          <Upload className="mx-auto mb-4 text-muted-foreground" size={48} />
          <h3 className="text-lg font-semibold mb-2">
            Select a folder starting with "Heptabase-Data-Backup-"
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Or drag and drop the folder here
          </p>
          <input
            {...getInputProps({
              // @ts-expect-error
              webkitdirectory: "true",
            })}
          />
          <Button size="lg" onClick={onClickDropzone}>
            Start Exporting for Free
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Note: If you have a ZIP file, please extract it before selecting the
            folder.
          </p>
        </div>

        <p className="text-sm text-muted-foreground mb-8 text-center max-w-xl">
          Data processing is done entirely in your browser and is never sent to
          any server.
          <br />
          Your data remains safe at all times. This service is completely free,
          with no hidden costs.
        </p>

        <section className="w-full max-w-4xl">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Data Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Combine multiple files into one</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Zap className="w-4 h-4 mr-2" />
                  Flexible Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Extract only necessary information</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Brain className="w-4 h-4 mr-2" />
                  AI-Compatible Format
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Output in a format usable by AI tools</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Shield className="w-4 h-4 mr-2" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Safely processed in your browser</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Bundle My Heptabase</p>
        </div>
      </footer>
    </div>
  );
}
