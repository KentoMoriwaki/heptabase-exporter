import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ExportInstructionModal(props: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { isOpen, onClose } = props;
  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        onClose();
      }}
    >
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Export Instructions</DialogTitle>
          <DialogDescription>
            Follow these steps to export your data:
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="w-full">
          <Accordion type="multiple" className="max-h-[80vh] w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                Step 1: Open the Settings Dialog
              </AccordionTrigger>
              <AccordionContent>
                Click the settings icon at the top-left corner of the Heptabase
                app window.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>
                Step 2: Click &quot;Backup &amp; Sync&quot; {">"} &quot;Export
                Now&quot;
              </AccordionTrigger>
              <AccordionContent>
                <img src="/export-instruction-1.png" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>
                Step 3: Click &quot;Export&quot;
              </AccordionTrigger>
              <AccordionContent>
                <p>
                  If you want to include files and images, make sure to select
                  the &quot;Include files and images&quot; checkbox.
                </p>
                <img src="/export-instruction-2.png" className="mt-2" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
        <DialogFooter>
          <Button
            onClick={() => {
              onClose();
            }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
