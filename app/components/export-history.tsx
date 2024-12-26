import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportStateEntity, getIDBHandler } from "@/lib/indexed-db";
import { Check, Clock, Pencil, Star, Trash2, X } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

type HistoryListProps = {
  items: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onStar: (id: string) => void;
  onRename: (id: string, newName: string) => void;
};

export const HistoryList: React.FC<HistoryListProps> = ({
  items = [],
  onRestore,
  onDelete,
  onStar,
  onRename,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  const handleEditStart = (item: HistoryItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const handleEditSave = () => {
    if (editingId) {
      onRename(editingId, editingName);
      setEditingId(null);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No history items found.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      {items.map((item) => (
        <div key={item.id} className="flex items-center p-2 hover:bg-accent">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStar(item.id)}
            className="mr-2"
          >
            <Star
              className={`h-4 w-4 ${item.isStarred ? "fill-yellow-400" : ""}`}
            />
          </Button>
          {editingId === item.id ? (
            <div className="flex-1 flex items-center space-x-2">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="h-8"
              />
              <Button variant="ghost" size="icon" onClick={handleEditSave}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleEditCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Link
                to={{
                  search: `?h=${item.id}`,
                }}
                className="flex-1"
                onClick={() => onRestore(item)}
              >
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">
                  {item.date.toLocaleDateString()}
                </div>
              </Link>
              <div className="flex space-x-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditStart(item)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
    </ScrollArea>
  );
};

export type HistoryItem = {
  id: string;
  date: Date;
  state: ExportStateEntity;
  isStarred: boolean;
  name: string;
};

export const ExportHistory: React.FC<{ accountId: string }> = ({
  accountId,
}) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadHistory = useCallback(async () => {
    const dbHandler = await getIDBHandler(accountId);
    const historyItems = await dbHandler.getExportHistory();
    setHistory(historyItems);
  }, [accountId]);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only when mounted
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadHistory();
    }
  };

  const handleRestore = async (_item: HistoryItem) => {
    setIsOpen(false); // Close the popover when selecting a history item
  };

  const handleDelete = async (id: string) => {
    const dbHandler = await getIDBHandler(accountId);
    await dbHandler.deleteExportHistory(id);
    setHistory(history.filter((item) => item.id !== id));
  };

  const handleStar = async (id: string) => {
    const dbHandler = await getIDBHandler(accountId);
    const item = history.find((item) => item.id === id);
    if (item) {
      const updatedItem = { ...item, isStarred: !item.isStarred };
      await dbHandler.saveExportHistory(updatedItem);
      setHistory(history.map((h) => (h.id === id ? updatedItem : h)));
    }
  };

  const handleRename = async (id: string, newName: string) => {
    const dbHandler = await getIDBHandler(accountId);
    const item = history.find((item) => item.id === id);
    if (item) {
      const updatedItem = { ...item, name: newName };
      await dbHandler.saveExportHistory(updatedItem);
      setHistory(history.map((h) => (h.id === id ? updatedItem : h)));
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-10 p-0">
          <Clock className="h-4 w-4" />
          <span className="sr-only">Open export history</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="bottom" align="end">
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="starred">Starred</TabsTrigger>
          </TabsList>
          <TabsContent value="history">
            <HistoryList
              items={history}
              onRestore={handleRestore}
              onDelete={handleDelete}
              onStar={handleStar}
              onRename={handleRename}
            />
          </TabsContent>
          <TabsContent value="starred">
            <HistoryList
              items={history.filter((item) => item.isStarred)}
              onRestore={handleRestore}
              onDelete={handleDelete}
              onStar={handleStar}
              onRename={handleRename}
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
