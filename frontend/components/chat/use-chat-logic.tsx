import { useState, useEffect } from "react";
import { ChatMessage, ModelKey } from "@/lib/types";

interface DynamicExamples {
  database: string[];
  collection: string[];
}

export function useChatLogic(selectedModel: ModelKey) {
  const [collections, setCollections] = useState<string[]>([]);
  const [demoExamples, setDemoExamples] = useState<DynamicExamples>({
    database: [
      "What collections exist in my database?",
      "How many artists are in the database?",
      "Describe my database",
      "How many total vectors are there?",
    ],
    collection: [
      "How many artists are there?",
      "Find images by artists",
      "List all artists",
      "Describe this collection",
    ],
  });

  const loadCollectionsAndGenerateExamples = async () => {
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "What collections exist?",
          model: selectedModel,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.collections) {
          const collectionsData = data.data.collections;
          const collectionNames = collectionsData.map((c: any) => c.name);
          setCollections(collectionNames);

          // Generate dynamic examples based on actual data
          await generateDynamicExamples(collectionsData);
        }
      }
    } catch (error) {
      console.error("Failed to load collections:", error);
    }
  };

  const generateDynamicExamples = async (collectionsData: any[]) => {
    try {
      // Find collections with data
      const collectionsWithData = collectionsData.filter(
        (c: any) => c.vectors_count > 0
      );
      const largestCollection = collectionsData.reduce(
        (max: any, current: any) =>
          current.vectors_count > max.vectors_count ? current : max
      );

      // Generate database-level examples
      const databaseExamples = [
        "What collections exist in my database?",
        `How many total vectors are across all collections?`,
        "Describe my database overview",
        collectionsData.length > 1
          ? "How many artists are there across all collections?"
          : "How many collections do I have?",
      ];

      // Generate collection-specific examples
      let collectionExamples: string[] = [];

      if (collectionsWithData.length > 0) {
        // Try to get some sample artist data for better examples
        const sampleCollection = largestCollection.name;

        try {
          const artistResponse = await fetch("/api/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              collection: sampleCollection,
              question: "List a few artists",
              model: selectedModel,
            }),
          });

          let sampleArtists: string[] = [];
          if (artistResponse.ok) {
            const artistData = await artistResponse.json();
            if (artistData.data?.artists) {
              sampleArtists = artistData.data.artists.slice(0, 2);
            }
          }

          // Create examples with actual collection names and artist names
          collectionExamples = [
            `How many artists in ${sampleCollection}?`,
            `How many vectors are in ${sampleCollection}?`,
            sampleArtists.length > 0
              ? `Find ${sampleArtists[0]} images in ${sampleCollection}`
              : `Find images in ${sampleCollection}`,
            `Describe the ${sampleCollection} collection`,
          ];

          // Add examples for other collections if they exist
          if (collectionsWithData.length > 1) {
            const otherCollection = collectionsWithData.find(
              (c: any) => c.name !== sampleCollection
            );
            if (otherCollection) {
              collectionExamples[1] = `How many artists in ${otherCollection.name}?`;
            }
          }

          // Add cross-collection search if we have artists
          if (sampleArtists.length > 0 && collectionsData.length > 1) {
            collectionExamples.push(
              `Find ${sampleArtists[0]} images across all collections`
            );
          }
        } catch (error) {
          console.warn("Failed to get artist data for examples:", error);
          // Fallback to collection names only
          collectionExamples = [
            `How many artists in ${largestCollection.name}?`,
            `How many vectors are in ${largestCollection.name}?`,
            `List all artists in ${largestCollection.name}`,
            `Describe the ${largestCollection.name} collection`,
          ];
        }
      } else {
        // Fallback if no collections have data
        const firstCollection = collectionsData[0]?.name || "your_collection";
        collectionExamples = [
          `How many artists in ${firstCollection}?`,
          `How many vectors are in ${firstCollection}?`,
          `List all artists in ${firstCollection}`,
          `Describe the ${firstCollection} collection`,
        ];
      }

      setDemoExamples({
        database: databaseExamples.slice(0, 4),
        collection: collectionExamples.slice(0, 4),
      });
    } catch (error) {
      console.error("Failed to generate dynamic examples:", error);
      // Keep default examples if generation fails
    }
  };

  // Load collections on mount
  useEffect(() => {
    loadCollectionsAndGenerateExamples();
  }, []);

  return {
    collections,
    demoExamples,
    loadCollectionsAndGenerateExamples,
  };
}
