import { Badge } from "@/components/ui/badge";

export function useDataFormatting() {
  const formatData = (data: any, queryType: string) => {
    if (!data) return null;

    // Handle different data types with consistent formatting
    if (queryType === "collections" && data.collections) {
      return (
        <div className="mt-2 space-y-1">
          <div className="text-sm font-medium text-muted-foreground">
            Collections Found:
          </div>
          {data.collections.map((collection: any, index: number) => (
            <div
              key={index}
              className="text-sm bg-muted rounded px-2 py-1 border"
            >
              <span className="font-medium">{collection.name}</span>
              {collection.vectors_count !== undefined && (
                <span className="text-muted-foreground ml-2">
                  ({collection.vectors_count.toLocaleString()} vectors)
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (queryType === "database" && data.collections) {
      return (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-muted-foreground">
              Total Collections:{" "}
              <span className="font-medium text-foreground">
                {data.total_collections}
              </span>
            </div>
            <div className="text-muted-foreground">
              Total Vectors:{" "}
              <span className="font-medium text-foreground">
                {data.total_vectors?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (
      (queryType === "count" || queryType === "describe") &&
      data.count !== undefined
    ) {
      return (
        <div className="mt-2 text-sm">
          <Badge variant="secondary">{data.count.toLocaleString()} items</Badge>
          {data.artist && (
            <div className="mt-1 text-muted-foreground">
              Artist:{" "}
              <span className="text-foreground font-medium">{data.artist}</span>
            </div>
          )}
          {data.by_collection && data.by_collection.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-muted-foreground">
                Found in collections:
              </div>
              {data.by_collection.map((col: any, index: number) => (
                <div
                  key={index}
                  className="text-xs bg-muted rounded px-2 py-1 border"
                >
                  <span className="text-foreground">{col.collection}</span>:{" "}
                  <span className="text-muted-foreground">
                    {col.count} images
                  </span>
                </div>
              ))}
            </div>
          )}
          {data.artists && data.artists.length > 0 && (
            <div className="mt-1 text-muted-foreground">
              Artists: {data.artists.slice(0, 5).join(", ")}
              {data.artists.length > 5 && "..."}
            </div>
          )}
        </div>
      );
    }

    if (queryType === "summarize") {
      return (
        <div className="mt-2 space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Summary of {data.artist}'s Work:
          </div>
          <div className="bg-muted rounded p-3 border space-y-2">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="text-muted-foreground">
                Total Images:{" "}
                <span className="text-foreground font-medium">
                  {data.total_images || 0}
                </span>
              </div>
              <div className="text-muted-foreground">
                Displayed:{" "}
                <span className="text-foreground font-medium">
                  {data.displayed_images || 0}
                </span>
              </div>
            </div>
            {data.collections_found && (
              <div className="text-xs text-muted-foreground">
                Found in:{" "}
                <span className="text-foreground">
                  {data.collections_found} collections
                </span>
              </div>
            )}
            {data.file_types && data.file_types.length > 0 && (
              <div className="text-xs text-muted-foreground">
                File Types:{" "}
                <span className="text-foreground">
                  {data.file_types.join(", ")}
                </span>
              </div>
            )}
            {data.sample_images && data.sample_images.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  Sample Images:
                </div>
                {data.sample_images
                  .slice(0, 3)
                  .map((img: any, index: number) => (
                    <div
                      key={index}
                      className="text-xs bg-card rounded px-2 py-1 border"
                    >
                      <span className="text-primary">{img.filename}</span>
                      {img.collection && (
                        <span className="text-muted-foreground ml-1">
                          ({img.collection})
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (queryType === "analyze") {
      return (
        <div className="mt-2 space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Analysis of {data.artist}'s Work:
          </div>
          <div className="bg-muted rounded p-3 border space-y-2">
            <div className="text-xs">
              <span className="text-muted-foreground">Total Images: </span>
              <span className="text-foreground font-medium">
                {data.total_images || 0}
              </span>
            </div>
            {data.file_type_distribution &&
              Object.keys(data.file_type_distribution).length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    File Types:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(data.file_type_distribution).map(
                      ([type, count]: [string, any]) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}: {count}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}
            {data.common_naming_patterns &&
              Object.keys(data.common_naming_patterns).length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    Common Patterns:
                  </div>
                  {Object.entries(data.common_naming_patterns)
                    .slice(0, 3)
                    .map(([pattern, count]: [string, any]) => (
                      <div
                        key={pattern}
                        className="text-xs text-muted-foreground"
                      >
                        <code className="bg-card px-1 rounded text-primary">
                          "{pattern}"
                        </code>{" "}
                        - {count} files
                      </div>
                    ))}
                </div>
              )}
          </div>
        </div>
      );
    }

    if (queryType === "search" && data.results_by_collection) {
      return (
        <div className="mt-2 space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Search Results ({data.total_count} total):
          </div>
          {data.results_by_collection
            .slice(0, 3)
            .map((result: any, index: number) => (
              <div
                key={index}
                className="text-sm bg-muted rounded px-2 py-1 border"
              >
                <span className="font-medium text-foreground">
                  {result.collection}
                </span>
                :{" "}
                <span className="text-muted-foreground">
                  {result.count} matches
                </span>
              </div>
            ))}
        </div>
      );
    }

    return null;
  };

  return { formatData };
}
