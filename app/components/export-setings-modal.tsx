import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ExportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
}

export interface ExportSettings {
  includeLinkedCards: boolean;
  includeLinkedFiles: boolean;
  includeImages: boolean;
  includeAudioVideo: boolean;
  includeOtherFiles: boolean;
}

export function ExportSettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: ExportSettingsModalProps) {
  const handleSettingChange =
    (key: keyof ExportSettings) => (checked: boolean) => {
      onSettingsChange({ ...settings, [key]: checked });
    };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Settings</DialogTitle>
          <DialogDescription>
            Configure your export preferences
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeLinkedCards"
              checked={settings.includeLinkedCards}
              onCheckedChange={handleSettingChange("includeLinkedCards")}
            />
            <Label htmlFor="includeLinkedCards">Include linked cards</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeLinkedFiles"
              checked={settings.includeLinkedFiles}
              onCheckedChange={handleSettingChange("includeLinkedFiles")}
            />
            <Label htmlFor="includeLinkedFiles">
              Include linked files (exports as ZIP)
            </Label>
          </div>
          {settings.includeLinkedFiles && (
            <div className="ml-6 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeImages"
                  checked={settings.includeImages}
                  onCheckedChange={handleSettingChange("includeImages")}
                />
                <Label htmlFor="includeImages">Images</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAudioVideo"
                  checked={settings.includeAudioVideo}
                  onCheckedChange={handleSettingChange("includeAudioVideo")}
                />
                <Label htmlFor="includeAudioVideo">Audio and Video</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeOtherFiles"
                  checked={settings.includeOtherFiles}
                  onCheckedChange={handleSettingChange("includeOtherFiles")}
                />
                <Label htmlFor="includeOtherFiles">
                  Other files (e.g. PDF, DOCX and others)
                </Label>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
