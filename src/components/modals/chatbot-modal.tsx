"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { mentorBotAssistance } from "@/ai/flows/mentor-bot-assistance";
import { Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChatMessage = {
  sender: "user" | "chief";
  text: string;
};

type ChatbotModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ChatbotModal({ isOpen, onClose }: ChatbotModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "chief",
      text: "Welcome! I am Chief, your guide. Ask me anything about the Tribe.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    const userMessage = inputValue.trim();
    if (userMessage === "" || isLoading) return;

    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await mentorBotAssistance({ question: userMessage });
      setMessages((prev) => [
        ...prev,
        { sender: "chief", text: response.answer },
      ]);
    } catch (error) {
      console.error("Error with mentor bot:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "chief",
          text: "I seem to be having trouble connecting. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[70vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-2xl font-bold text-foreground">
            Chat with the Chief
          </DialogTitle>
          <DialogDescription>
            This is a chat window where you can ask questions to the Chief.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow p-4">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`p-3 rounded-lg max-w-xs ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
             {isLoading && (
              <div className="flex justify-start">
                <div className="p-3 rounded-lg max-w-xs bg-secondary text-secondary-foreground">
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse"></span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>
        <div className="p-4 border-t bg-muted/50 flex items-center gap-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-grow"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue}
            size="icon"
            className="bg-primary hover:bg-primary/90 rounded-full"
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Send Message</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
