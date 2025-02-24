import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HBData } from "@/lib/hb-types";
import {
  AccountEntity,
  getIDBHandler,
  getIDBMasterHandler,
} from "@/lib/indexed-db";
import { cn } from "@/lib/utils";
import { Brain, FileText, History, Shield, Upload, Zap } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Link, useNavigate } from "react-router";
import { Header } from "./header";
import { useState } from "react";
import { ExportInstructionModal } from "./export-instruction-modal";

export function Home({ accounts }: { accounts: AccountEntity[] }) {
  const navigate = useNavigate();

  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);

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
          'The directory does not contain a file named "All-Data.json".',
        );
      }
      const allData: HBData = JSON.parse(await allDataFile.text());
      const accountId = allData.ACCOUNT_ID;

      const allDataPath = allDataFile.path || allDataFile.webkitRelativePath;
      const rootDirPath = allDataPath.slice(
        0,
        allDataPath.length - "All-Data.json".length,
      );
      // Remove slashes and dots at the beginning and the end from the folder name
      const folderName = rootDirPath.replace(/^[/.]+|[/.]+$/g, "");

      await masterDB.saveAccount(accountId, folderName);
      const accountDb = await getIDBHandler(accountId);
      await accountDb.deleteFiles();

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
        isDragActive && "bg-primary/10 border-2 border-dashed border-primary",
      )}
    >
      <Header />
      {accounts.length > 0 && (
        <div className="w-full flex justify-center">
          <Card className="w-full max-w-xl mt-8 mb-4 mx-4">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <History className="w-5 h-5 mr-2" />
                Resume from Previous Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                You have previously uploaded data. Would you like to continue
                where you left off?
              </p>
              <Button asChild>
                <Link to={`/accounts/${accounts[0].id}`}>
                  Resume Previous Session
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="flex-grow flex flex-col justify-center items-center p-4">
        <section className="text-center mb-8 max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">
            Bundle Your Heptabase Data
            <br />
            for AI Tools
          </h2>
          <p className="text-xl mb-6">
            Safely organize your exported data and
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
            Select a folder starting with &quot;Heptabase-Data-Backup-&quot;
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Or drag and drop the folder here
          </p>
          <input
            {...getInputProps({
              // @ts-expect-error -- Ignore for now
              webkitdirectory: "true",
            })}
          />
          <Button size="lg" onClick={onClickDropzone}>
            Start Bundling Heptabase Data
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            <Button
              variant={"link"}
              className="h-auto p-0 text-muted-foreground font-medium"
              onClick={() => setIsInstructionModalOpen(true)}
            >
              How to export your data from Heptabase?
            </Button>
          </p>
        </div>

        <p className="text-sm text-muted-foreground mb-8 text-center max-w-xl">
          Data processing is done entirely in your browser and is never sent to
          any server.
          <br />
          Your data remains safe at all times. This service is completely free,
          without any hidden costs.
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

      {isInstructionModalOpen && (
        <ExportInstructionModal
          isOpen={isInstructionModalOpen}
          onClose={() => setIsInstructionModalOpen(false)}
        />
      )}
    </div>
  );
}
