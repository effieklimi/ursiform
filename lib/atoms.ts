import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { ModelKey, ConversationContext } from "@/lib/types";

// Global model selection atom with localStorage persistence
export const selectedModelAtom = atomWithStorage<ModelKey>(
  "selectedModel",
  "gpt-4o-mini"
);

// Global collection selection atom
export const selectedCollectionAtom = atom<string>("");

// Global conversation context atom
export const conversationContextAtom = atom<ConversationContext>({
  conversationHistory: [],
});
